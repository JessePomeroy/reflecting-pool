<script lang="ts">
	import { getContext, onMount } from "svelte";
	import { browser } from "$app/environment";
	import type { ParallaxContext } from "$lib/types/gallery";

	const parallax = getContext<ParallaxContext>("parallax");

	let canvas: HTMLCanvasElement | undefined = $state();
	let enabled = $state(false);

	// Stash refs so $effect can access renderer state
	const refs: Record<string, any> = {};

	onMount(() => {
		if (!browser) return;

		// Only skip on actual touch screens and reduced motion
		const isTrueTouchScreen = window.matchMedia('(pointer: coarse)').matches;
		if (isTrueTouchScreen) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		import("three").then((THREE) => {
			if (!canvas) return;

			const W = window.innerWidth;
			const H = window.innerHeight;

			// — Renderer ————————————————————————————————————————————
			const renderer = new THREE.WebGLRenderer({
				canvas,
				alpha: true,
				antialias: false,
				powerPreference: "low-power",
			});
			renderer.setPixelRatio(0.5); // half res for performance
			renderer.setSize(W, H);
			renderer.autoClear = false;

			// — Simulation resolution (quarter for speed) ——————————
			const simScale = 0.25;
			let simW = Math.round(W * simScale);
			let simH = Math.round(H * simScale);
			// Dye at half res for visual quality
			const dyeScale = 0.5;
			let dyeW = Math.round(W * dyeScale);
			let dyeH = Math.round(H * dyeScale);

			const texelSize = new THREE.Vector2(1.0 / simW, 1.0 / simH);
			const dyeTexelSize = new THREE.Vector2(1.0 / dyeW, 1.0 / dyeH);

			// — FBO helper ——————————————————————————————————————————
			function createFBO(w: number, h: number, type = THREE.HalfFloatType) {
				const fbo = new THREE.WebGLRenderTarget(w, h, {
					minFilter: THREE.LinearFilter,
					magFilter: THREE.LinearFilter,
					format: THREE.RGBAFormat,
					type,
					depthBuffer: false,
					stencilBuffer: false,
				});
				return fbo;
			}

			function createDoubleFBO(w: number, h: number) {
				return {
					read: createFBO(w, h),
					write: createFBO(w, h),
					swap() {
						const tmp = this.read;
						this.read = this.write;
						this.write = tmp;
					},
				};
			}

			// — FBOs ————————————————————————————————————————————————
			let velocity = createDoubleFBO(simW, simH);
			let pressure = createDoubleFBO(simW, simH);
			let divergenceFBO = createFBO(simW, simH);
			let dye = createDoubleFBO(dyeW, dyeH);

			// — Fullscreen quad ————————————————————————————————————
			const scene = new THREE.Scene();
			const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
			const quadGeom = new THREE.PlaneGeometry(2, 2);

			// — Shared vertex shader ————————————————————————————————
			const vertexShader = `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = vec4(position, 1.0);
				}
			`;

			// — Advection shader ————————————————————————————————————
			const advectionFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uVelocity;
				uniform sampler2D uSource;
				uniform vec2 uTexelSize;
				uniform float uDt;
				uniform float uDissipation;

				void main() {
					vec2 vel = texture2D(uVelocity, vUv).xy;
					vec2 coord = vUv - vel * uTexelSize * uDt;
					gl_FragColor = uDissipation * texture2D(uSource, coord);
				}
			`;

			// — Splat shader (inject force/dye) ————————————————————
			const splatFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uTarget;
				uniform vec2 uPoint;
				uniform vec3 uColor;
				uniform float uRadius;
				uniform float uAspectRatio;

				void main() {
					vec2 p = vUv - uPoint;
					p.x *= uAspectRatio;
					float splat = exp(-dot(p, p) / uRadius);
					vec3 base = texture2D(uTarget, vUv).xyz;
					gl_FragColor = vec4(base + uColor * splat, 1.0);
				}
			`;

			// — Divergence shader ——————————————————————————————————
			const divergenceFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uVelocity;
				uniform vec2 uTexelSize;

				void main() {
					float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
					float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
					float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
					float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
					float div = 0.5 * (R - L + T - B);
					gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
				}
			`;

			// — Pressure solver (Jacobi iteration) ————————————————
			const pressureFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uPressure;
				uniform sampler2D uDivergence;
				uniform vec2 uTexelSize;

				void main() {
					float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
					float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
					float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
					float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
					float div = texture2D(uDivergence, vUv).x;
					float p = (L + R + B + T - div) * 0.25;
					gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
				}
			`;

			// — Gradient subtraction ——————————————————————————————
			const gradientSubFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uPressure;
				uniform sampler2D uVelocity;
				uniform vec2 uTexelSize;

				void main() {
					float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
					float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
					float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
					float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
					vec2 vel = texture2D(uVelocity, vUv).xy;
					vel -= 0.5 * vec2(R - L, T - B);
					gl_FragColor = vec4(vel, 0.0, 1.0);
				}
			`;

			// — Display shader (render dye to screen) —————————————
			const displayFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uDye;

				void main() {
					vec3 c = texture2D(uDye, vUv).rgb;
					// Tone mapping — keep it ethereal
					float brightness = max(c.r, max(c.g, c.b));
					float alpha = smoothstep(0.01, 0.15, brightness);
					// Slight bloom/glow
					vec3 color = c * 1.2;
					gl_FragColor = vec4(color, alpha * 0.7);
				}
			`;

			// — Clear shader ——————————————————————————————————————
			const clearFrag = `
				precision highp float;
				varying vec2 vUv;
				uniform sampler2D uTexture;
				uniform float uValue;

				void main() {
					gl_FragColor = uValue * texture2D(uTexture, vUv);
				}
			`;

			// — Create materials ——————————————————————————————————
			function makeMaterial(frag: string, uniforms: Record<string, any>) {
				return new THREE.ShaderMaterial({
					vertexShader,
					fragmentShader: frag,
					uniforms,
					transparent: true,
					depthTest: false,
				});
			}

			const advectionMat = makeMaterial(advectionFrag, {
				uVelocity: { value: null },
				uSource: { value: null },
				uTexelSize: { value: texelSize },
				uDt: { value: 0.016 },
				uDissipation: { value: 0.98 },
			});

			const splatMat = makeMaterial(splatFrag, {
				uTarget: { value: null },
				uPoint: { value: new THREE.Vector2() },
				uColor: { value: new THREE.Vector3() },
				uRadius: { value: 0.0003 },
				uAspectRatio: { value: W / H },
			});

			const divergenceMat = makeMaterial(divergenceFrag, {
				uVelocity: { value: null },
				uTexelSize: { value: texelSize },
			});

			const pressureMat = makeMaterial(pressureFrag, {
				uPressure: { value: null },
				uDivergence: { value: null },
				uTexelSize: { value: texelSize },
			});

			const gradientSubMat = makeMaterial(gradientSubFrag, {
				uPressure: { value: null },
				uVelocity: { value: null },
				uTexelSize: { value: texelSize },
			});

			const displayMat = makeMaterial(displayFrag, {
				uDye: { value: null },
			});

			const clearMat = makeMaterial(clearFrag, {
				uTexture: { value: null },
				uValue: { value: 0.8 },
			});

			const quad = new THREE.Mesh(quadGeom, advectionMat);
			scene.add(quad);

			// — Render pass helper ————————————————————————————————
			function blit(target: any, material: any) {
				quad.material = material;
				renderer.setRenderTarget(target);
				renderer.render(scene, camera);
			}

			// — Mouse state ——————————————————————————————————————
			let lastX = 0;
			let lastY = 0;
			let firstFrame = true;
			let lastTime = performance.now();

			// — Resize handler ————————————————————————————————————
			function handleResize() {
				const nW = window.innerWidth;
				const nH = window.innerHeight;
				renderer.setSize(nW, nH);
				splatMat.uniforms.uAspectRatio.value = nW / nH;

				// Rebuild FBOs at new resolution
				simW = Math.round(nW * simScale);
				simH = Math.round(nH * simScale);
				dyeW = Math.round(nW * dyeScale);
				dyeH = Math.round(nH * dyeScale);

				texelSize.set(1.0 / simW, 1.0 / simH);
				dyeTexelSize.set(1.0 / dyeW, 1.0 / dyeH);

				velocity.read.setSize(simW, simH);
				velocity.write.setSize(simW, simH);
				pressure.read.setSize(simW, simH);
				pressure.write.setSize(simW, simH);
				divergenceFBO.setSize(simW, simH);
				dye.read.setSize(dyeW, dyeH);
				dye.write.setSize(dyeW, dyeH);
			}
			window.addEventListener("resize", handleResize, { passive: true });

			// — Store refs ————————————————————————————————————————
			refs.renderer = renderer;
			refs.blit = blit;
			refs.velocity = velocity;
			refs.pressure = pressure;
			refs.divergenceFBO = divergenceFBO;
			refs.dye = dye;
			refs.advectionMat = advectionMat;
			refs.splatMat = splatMat;
			refs.divergenceMat = divergenceMat;
			refs.pressureMat = pressureMat;
			refs.gradientSubMat = gradientSubMat;
			refs.displayMat = displayMat;
			refs.clearMat = clearMat;
			refs.texelSize = texelSize;
			refs.dyeTexelSize = dyeTexelSize;
			refs.lastX = lastX;
			refs.lastY = lastY;
			refs.firstFrame = firstFrame;
			refs.lastTime = lastTime;
			refs.handleResize = handleResize;
			enabled = true;

			return () => {
				window.removeEventListener("resize", handleResize);
				velocity.read.dispose();
				velocity.write.dispose();
				pressure.read.dispose();
				pressure.write.dispose();
				divergenceFBO.dispose();
				dye.read.dispose();
				dye.write.dispose();
				quadGeom.dispose();
				advectionMat.dispose();
				splatMat.dispose();
				divergenceMat.dispose();
				pressureMat.dispose();
				gradientSubMat.dispose();
				displayMat.dispose();
				clearMat.dispose();
				renderer.dispose();
				enabled = false;
			};
		}).catch((err) => {
			if (import.meta.env.DEV) console.error('[LiquidCursor] Failed to load Three.js:', err);
		});
	});

	// — Render loop tied to parallax tick ————————————————————————
	$effect(() => {
		if (!enabled) return;
		const _tick = parallax.tick;

		const {
			blit, velocity, pressure, divergenceFBO, dye,
			advectionMat, splatMat, divergenceMat, pressureMat,
			gradientSubMat, displayMat, clearMat, texelSize, dyeTexelSize,
		} = refs;

		const now = performance.now();
		const dt = Math.min((now - refs.lastTime) * 0.001, 0.033); // cap at ~30fps worth
		refs.lastTime = now;

		// Mouse position in UV space (0-1)
		const mx = parallax.smoothPixelX / window.innerWidth;
		const my = 1.0 - parallax.smoothPixelY / window.innerHeight; // flip Y

		if (refs.firstFrame) {
			refs.lastX = mx;
			refs.lastY = my;
			refs.firstFrame = false;
			return;
		}

		const dx = (mx - refs.lastX) * window.innerWidth;
		const dy = (my - refs.lastY) * window.innerHeight;
		const speed = Math.sqrt(dx * dx + dy * dy);

		// — Splat velocity + dye on mouse movement ——————————————
		if (speed > 0.5) {
			// Velocity splat
			splatMat.uniforms.uTarget.value = velocity.read.texture;
			splatMat.uniforms.uPoint.value.set(mx, my);
			splatMat.uniforms.uColor.value.set(dx * 5.0, dy * 5.0, 0.0);
			splatMat.uniforms.uRadius.value = 0.0004;
			blit(velocity.write, splatMat);
			velocity.swap();

			// Dye splat — ethereal blue-white palette
			const hue = (now * 0.0001) % 1.0;
			const r = 0.4 + 0.3 * Math.sin(hue * 6.28);
			const g = 0.5 + 0.2 * Math.sin(hue * 6.28 + 2.0);
			const b = 0.7 + 0.3 * Math.sin(hue * 6.28 + 4.0);

			splatMat.uniforms.uTarget.value = dye.read.texture;
			splatMat.uniforms.uColor.value.set(r * speed * 0.15, g * speed * 0.15, b * speed * 0.15);
			splatMat.uniforms.uRadius.value = 0.0006;
			blit(dye.write, splatMat);
			dye.swap();
		}

		refs.lastX = mx;
		refs.lastY = my;

		// — Advect velocity ————————————————————————————————————
		advectionMat.uniforms.uVelocity.value = velocity.read.texture;
		advectionMat.uniforms.uSource.value = velocity.read.texture;
		advectionMat.uniforms.uTexelSize.value = texelSize;
		advectionMat.uniforms.uDt.value = dt * 60.0;
		advectionMat.uniforms.uDissipation.value = 0.97;
		blit(velocity.write, advectionMat);
		velocity.swap();

		// — Compute divergence ————————————————————————————————
		divergenceMat.uniforms.uVelocity.value = velocity.read.texture;
		blit(divergenceFBO, divergenceMat);

		// — Clear pressure ————————————————————————————————————
		clearMat.uniforms.uTexture.value = pressure.read.texture;
		clearMat.uniforms.uValue.value = 0.8;
		blit(pressure.write, clearMat);
		pressure.swap();

		// — Jacobi pressure solve (20 iterations) ————————————
		pressureMat.uniforms.uDivergence.value = divergenceFBO.texture;
		for (let i = 0; i < 20; i++) {
			pressureMat.uniforms.uPressure.value = pressure.read.texture;
			blit(pressure.write, pressureMat);
			pressure.swap();
		}

		// — Subtract pressure gradient ————————————————————————
		gradientSubMat.uniforms.uPressure.value = pressure.read.texture;
		gradientSubMat.uniforms.uVelocity.value = velocity.read.texture;
		blit(velocity.write, gradientSubMat);
		velocity.swap();

		// — Advect dye ————————————————————————————————————————
		advectionMat.uniforms.uVelocity.value = velocity.read.texture;
		advectionMat.uniforms.uSource.value = dye.read.texture;
		advectionMat.uniforms.uTexelSize.value = dyeTexelSize;
		advectionMat.uniforms.uDissipation.value = 0.985;
		blit(dye.write, advectionMat);
		dye.swap();

		// — Display ———————————————————————————————————————————
		displayMat.uniforms.uDye.value = dye.read.texture;
		blit(null, displayMat); // render to screen
	});
</script>

<canvas
	bind:this={canvas}
	class="liquid-cursor"
	aria-hidden="true"
></canvas>

<style>
	.liquid-cursor {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		pointer-events: none;
	}
</style>

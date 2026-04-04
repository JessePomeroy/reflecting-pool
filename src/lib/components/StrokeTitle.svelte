<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { browser } from "$app/environment";
    import type { ParallaxContext } from "$lib/types/gallery";

    const parallax = getContext<ParallaxContext>("parallax");

    let titleEl: HTMLElement | undefined = $state();
    let subtitleEl: HTMLElement | undefined = $state();
    let letterEls: HTMLElement[] = [];
    let rippleActive = $state(false);

    const title = "margaret helena";
    const subtitle = "photography";

    function handleClick(e: MouseEvent) {
        if (!titleEl || rippleActive) return;
        rippleActive = true;

        // Check for reduced motion preference
        const prefersReducedMotion =
            browser &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const clickX = e.clientX;

        // Batch read all letter positions (filter out undefined — spaces don't have refs)
        const validEls = letterEls.filter((el) => el != null);
        const rects = validEls.map((el) => el.getBoundingClientRect());

        // Apply wobble based on distance from click
        for (let i = 0; i < validEls.length; i++) {
            const rect = rects[i];
            const letterCenterX = rect.left + rect.width / 2;
            const dist = Math.abs(clickX - letterCenterX);
            const maxDist = window.innerWidth * 0.6;
            const intensity = Math.max(0, 1 - dist / maxDist);
            const direction = letterCenterX > clickX ? 1 : -1;
            const delay = dist * 0.5; // ms, ripple travels outward

            const wobbleX = direction * intensity * 6;
            const wobbleY = intensity * -4;
            const wobbleRot = direction * intensity * 2;

            const el = validEls[i];
            // Instant transition when reduced motion is preferred
            if (prefersReducedMotion) {
                el.style.transition = "none";
                el.style.transitionDelay = "0ms";
            } else {
                el.style.transition = `transform ${delay + 100}ms ease-out`;
                el.style.transitionDelay = `${delay}ms`;
            }
            el.style.transform = `translate(${wobbleX}px, ${wobbleY}px) rotate(${wobbleRot}deg)`;
        }

        // Ease back
        setTimeout(
            () => {
                for (const el of validEls) {
                    if (prefersReducedMotion) {
                        el.style.transition = "none";
                    } else {
                        el.style.transition = "transform 800ms ease-out";
                    }
                    el.style.transitionDelay = "0ms";
                    el.style.transform = "translate(0, 0) rotate(0)";
                }
                setTimeout(
                    () => {
                        rippleActive = false;
                    },
                    prefersReducedMotion ? 0 : 800,
                );
            },
            title.length * 15 + 300,
        );
    }

    function letterRef(node: HTMLElement, _idx: () => number) {
        letterEls[_idx()] = node;
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stroke-title" onclick={handleClick}>
    <h1 class="title" bind:this={titleEl}>
        {#each title.split("") as letter, i}
            {#if letter === " "}
                <span class="letter space">&nbsp;</span>
            {:else}
                <span class="letter" use:letterRef={() => i}>{letter}</span>
            {/if}
        {/each}
    </h1>
</div>

<style>
    .stroke-title {
        text-align: left;
        cursor: default;
        user-select: none;
        z-index: 16;
        position: relative;
    }

    .title {
        font-family: "Cormorant", serif;
        font-weight: 300;
        font-size: clamp(3.5rem, 14vw, 11rem);
        color: transparent;
        -webkit-text-stroke: 1.2px rgba(240, 244, 248, 0.85);
        letter-spacing: -0.03em;
        margin: 0;
        white-space: normal;
        line-height: 0.95;
        max-width: 90vw;
        padding-bottom: 1.5em;
        /* Fade bottom of title into background */
        mask-image: linear-gradient(to bottom, black 30%, transparent 90%);
        -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 90%);
    }

    @media (prefers-reduced-motion: no-preference) {
        .title {
            animation: rain-flicker 8s ease-in-out infinite;
        }
    }

    .letter {
        display: inline-block;
        will-change: auto;
        margin-right: -0.04em;
    }

    .letter.space {
        width: 0.3em;
    }

    @keyframes rain-flicker {
        0%,
        100% {
            opacity: 0.85;
        }
        30% {
            opacity: 0.82;
        }
        60% {
            opacity: 0.88;
        }
        80% {
            opacity: 0.84;
        }
    }

    @media (max-width: 767px) {
        .title {
            letter-spacing: -0.03em;
            -webkit-text-stroke: 1px rgba(240, 244, 248, 0.85);
        }
    }
</style>

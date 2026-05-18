import { fetchSanityOrFallback } from "$lib/server/sanityClient";

export interface ModelingImage {
	id: string;
	src: string;
	alt: string;
}

export interface ModelingGallery {
	title: string;
	slug: string;
	description?: string;
	images: ModelingImage[];
}

export interface ModelingPageContent {
	eyebrow: string;
	heading: string;
	intro?: string;
	galleries: ModelingGallery[];
	seo: {
		description: string;
		ogImage?: string;
	};
}

const MODELING_PAGE_QUERY = `
*[_type == "modelingPage"][0] {
  eyebrow,
  heading,
  intro,
  galleries[isVisible != false] {
    title,
    "slug": slug.current,
    description,
    images[] {
      "id": _key,
      "src": asset->url,
      alt
    }
  },
  "seo": {
    "description": seo.description,
    "ogImage": seo.ogImage.asset->url
  }
}
`;

export async function fetchModelingPageContent(): Promise<ModelingPageContent> {
	const content = await fetchSanityOrFallback<Partial<ModelingPageContent>>(
		MODELING_PAGE_QUERY,
		getFallbackModelingPageContent(),
	);

	return normalizeModelingPageContent(content);
}

export function normalizeModelingPageContent(
	content: Partial<ModelingPageContent>,
): ModelingPageContent {
	const fallback = getFallbackModelingPageContent();
	const galleries = normalizeModelingGalleries(content.galleries);

	return {
		eyebrow: content.eyebrow || fallback.eyebrow,
		heading: content.heading || fallback.heading,
		intro: content.intro || fallback.intro,
		galleries: galleries.length ? galleries : fallback.galleries,
		seo: {
			description: content.seo?.description || fallback.seo.description,
			ogImage: content.seo?.ogImage || fallback.seo.ogImage,
		},
	};
}

export function getFallbackModelingPageContent(): ModelingPageContent {
	return {
		eyebrow: "modeling & acting",
		heading: "digital headshots",
		intro: "placeholder selects for maggie's modeling, acting, and portrait work.",
		galleries: [
			{
				title: "Fashion Editorial",
				slug: "fashion-editorial",
				images: [
					{
						id: "fashion-01",
						src: "/images/flower-01.jpg",
						alt: "placeholder editorial headshot one",
					},
					{
						id: "fashion-02",
						src: "/images/flower-02.jpg",
						alt: "placeholder editorial headshot two",
					},
					{
						id: "fashion-03",
						src: "/images/flower-03.jpg",
						alt: "placeholder editorial headshot three",
					},
					{
						id: "fashion-04",
						src: "/images/flower-04.jpg",
						alt: "placeholder editorial headshot four",
					},
					{
						id: "fashion-05",
						src: "/images/flower-05.jpg",
						alt: "placeholder editorial headshot five",
					},
					{
						id: "fashion-06",
						src: "/images/flower-06.jpg",
						alt: "placeholder editorial headshot six",
					},
				],
			},
			{
				title: "Comp Card Digitals",
				slug: "comp-card-digitals",
				images: [
					{
						id: "digitals-01",
						src: "/images/flower-07.jpg",
						alt: "placeholder comp card digital one",
					},
					{
						id: "digitals-02",
						src: "/images/flower-08.jpg",
						alt: "placeholder comp card digital two",
					},
					{
						id: "digitals-03",
						src: "/images/flower-09.jpg",
						alt: "placeholder comp card digital three",
					},
					{
						id: "digitals-04",
						src: "/images/flower-10.jpg",
						alt: "placeholder comp card digital four",
					},
					{
						id: "digitals-05",
						src: "/images/flower-11.jpg",
						alt: "placeholder comp card digital five",
					},
					{
						id: "digitals-06",
						src: "/images/flower-13.jpg",
						alt: "placeholder comp card digital six",
					},
				],
			},
			{
				title: "Commercial",
				slug: "commercial",
				images: [
					{
						id: "commercial-01",
						src: "/images/flower-14.jpg",
						alt: "placeholder commercial headshot one",
					},
					{
						id: "commercial-02",
						src: "/images/flower-15.jpg",
						alt: "placeholder commercial headshot two",
					},
					{
						id: "commercial-03",
						src: "/images/flower-16.jpg",
						alt: "placeholder commercial headshot three",
					},
					{
						id: "commercial-04",
						src: "/images/flower-17.jpg",
						alt: "placeholder commercial headshot four",
					},
					{
						id: "commercial-05",
						src: "/images/flower-18.jpg",
						alt: "placeholder commercial headshot five",
					},
					{
						id: "commercial-06",
						src: "/images/flower-19.jpg",
						alt: "placeholder commercial headshot six",
					},
				],
			},
		],
		seo: {
			description: "Digital headshots and modeling portfolio for Margaret Helena.",
		},
	};
}

function normalizeModelingGalleries(galleries?: Partial<ModelingGallery>[]) {
	return (
		galleries
			?.map((gallery) => ({
				title: gallery.title ?? "",
				slug: gallery.slug ?? "",
				description: gallery.description,
				images:
					gallery.images
						?.map((image) => ({
							id: image.id ?? image.src ?? "",
							src: image.src ?? "",
							alt: image.alt || gallery.title || "modeling portfolio image",
						}))
						.filter((image) => image.id && image.src) ?? [],
			}))
			.filter((gallery) => gallery.title && gallery.slug && gallery.images.length) ?? []
	);
}

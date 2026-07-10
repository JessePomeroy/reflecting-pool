export function encodeShopSlug(slug: string) {
	return encodeURIComponent(slug);
}

export function shopCollectionPath(slug: string) {
	return `/shop/collection/${encodeShopSlug(slug)}`;
}

export function shopProductPath(slug: string) {
	return `/shop/${encodeShopSlug(slug)}`;
}

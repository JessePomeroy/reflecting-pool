# Sanity Schema — Reflecting Pool

## Overview

CMS for a photography portfolio. The client (photographer) needs to manage their galleries, bio, print shop, and booking inquiries — all from a clean, professional Sanity Studio dashboard.

Studio will be a separate repo: `reflecting-pool-studio`

---

## Document Types

### 1. `siteSettings` (singleton)

Global site configuration. One document, always present.

```ts
{
  name: 'siteSettings',
  type: 'document',
  title: 'Site Settings',
  icon: CogIcon,
  fields: [
    { name: 'artistName', type: 'string', title: 'Artist Name' },           // "Margaret Helena"
    { name: 'siteTitle', type: 'string', title: 'Site Title' },             // shown in <title>
    { name: 'tagline', type: 'string', title: 'Tagline' },                  // "photography"
    { name: 'logo', type: 'image', title: 'Logo / Favicon' },
    { name: 'headerBackground', type: 'color', title: 'Header Color' },     // #1a1f2e
    { name: 'pageBackground', type: 'color', title: 'Page Color' },         // #c8cfd8
    { name: 'causticVideo', type: 'file', title: 'Caustics Background Video',
      description: 'Looping video for underwater caustic effect (webm/mp4)' },
    { name: 'socialLinks', type: 'array', title: 'Social Links',
      of: [{ type: 'object', fields: [
        { name: 'platform', type: 'string', options: { list: ['instagram', 'tiktok', 'twitter', 'facebook', 'pinterest', 'youtube'] }},
        { name: 'url', type: 'url' }
      ]}]
    },
    { name: 'seo', type: 'object', title: 'SEO Defaults', fields: [
      { name: 'description', type: 'text', rows: 3 },
      { name: 'ogImage', type: 'image' },
      { name: 'keywords', type: 'array', of: [{ type: 'string' }] }
    ]}
  ]
}
```

### 2. `gallery`

A collection of photos displayed as a floating cluster on the homepage.

```ts
{
  name: 'gallery',
  type: 'document',
  title: 'Gallery',
  icon: ImagesIcon,
  fields: [
    { name: 'title', type: 'string', title: 'Gallery Title',
      validation: Rule => Rule.required() },                                 // "Wildflowers"
    { name: 'slug', type: 'slug', title: 'Slug',
      options: { source: 'title' },
      validation: Rule => Rule.required() },
    { name: 'description', type: 'text', title: 'Description', rows: 3 },
    { name: 'coverImage', type: 'image', title: 'Cover Image',
      description: 'Primary image shown in the cluster preview',
      options: { hotspot: true } },
    { name: 'images', type: 'array', title: 'Gallery Images',
      of: [{ type: 'galleryImage' }],
      validation: Rule => Rule.min(3).max(12) },
    { name: 'depth', type: 'number', title: 'Depth Layer',
      description: 'Parallax depth (0.1 = far back, 1.0 = foreground)',
      validation: Rule => Rule.min(0.1).max(1.0),
      initialValue: 0.5 },
    { name: 'sortOrder', type: 'number', title: 'Sort Order',
      description: 'Lower numbers appear first',
      initialValue: 0 },
    { name: 'isVisible', type: 'boolean', title: 'Visible on Site',
      initialValue: true },
    { name: 'seo', type: 'object', title: 'SEO', fields: [
      { name: 'description', type: 'text', rows: 2 },
      { name: 'ogImage', type: 'image' }
    ]}
  ],
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
    { title: 'Title A-Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] }
  ],
  preview: {
    select: { title: 'title', media: 'coverImage', imageCount: 'images.length' },
    prepare: ({ title, media, imageCount }) => ({
      title,
      subtitle: `${imageCount || 0} images`,
      media
    })
  }
}
```

### 3. `galleryImage` (object type, used within gallery)

```ts
{
  name: 'galleryImage',
  type: 'object',
  title: 'Gallery Image',
  fields: [
    { name: 'image', type: 'image', title: 'Photo',
      options: { hotspot: true },
      validation: Rule => Rule.required() },
    { name: 'caption', type: 'string', title: 'Caption' },
    { name: 'alt', type: 'string', title: 'Alt Text',
      validation: Rule => Rule.required() },
    { name: 'depth', type: 'number', title: 'Depth Override',
      description: 'Optional: override gallery depth for this image',
      validation: Rule => Rule.min(0.1).max(1.0) },
    { name: 'printAvailable', type: 'boolean', title: 'Available as Print',
      initialValue: false },
    { name: 'printSizes', type: 'array', title: 'Print Sizes',
      of: [{ type: 'reference', to: [{ type: 'printSize' }] }],
      hidden: ({ parent }) => !parent?.printAvailable }
  ],
  preview: {
    select: { media: 'image', caption: 'caption', alt: 'alt' },
    prepare: ({ media, caption, alt }) => ({
      title: caption || alt || 'Untitled',
      media
    })
  }
}
```

### 4. `aboutPage` (singleton)

```ts
{
  name: 'aboutPage',
  type: 'document',
  title: 'About Page',
  icon: UserIcon,
  fields: [
    { name: 'heading', type: 'string', title: 'Page Heading' },
    { name: 'portrait', type: 'image', title: 'Artist Portrait',
      options: { hotspot: true } },
    { name: 'bio', type: 'array', title: 'Biography',
      of: [{ type: 'block' }] },                                            // Portable Text
    { name: 'artistStatement', type: 'array', title: 'Artist Statement',
      of: [{ type: 'block' }] },
    { name: 'highlights', type: 'array', title: 'Highlights / Credits',
      of: [{ type: 'object', fields: [
        { name: 'label', type: 'string' },                                   // "Exhibition"
        { name: 'value', type: 'string' }                                    // "Chicago Art Fair 2024"
      ]}]
    },
    { name: 'seo', type: 'object', title: 'SEO', fields: [
      { name: 'description', type: 'text', rows: 2 },
      { name: 'ogImage', type: 'image' }
    ]}
  ]
}
```

### 5. `printSize`

Available print sizes for the shop.

```ts
{
  name: 'printSize',
  type: 'document',
  title: 'Print Size',
  icon: RulerIcon,
  fields: [
    { name: 'label', type: 'string', title: 'Label',
      description: 'e.g., "8×10 Archival Matte"' },
    { name: 'width', type: 'number', title: 'Width (inches)' },
    { name: 'height', type: 'number', title: 'Height (inches)' },
    { name: 'paperType', type: 'string', title: 'Paper Type',
      options: { list: ['Archival Matte', 'Lustre', 'Glossy', 'Fine Art Rag', 'Canvas'] }},
    { name: 'price', type: 'number', title: 'Base Price ($)',
      validation: Rule => Rule.min(0) },
    { name: 'isActive', type: 'boolean', title: 'Available for Sale',
      initialValue: true }
  ],
  preview: {
    select: { label: 'label', price: 'price', active: 'isActive' },
    prepare: ({ label, price, active }) => ({
      title: label,
      subtitle: active ? `$${price}` : 'Inactive'
    })
  }
}
```

### 6. `shopSettings` (singleton)

```ts
{
  name: 'shopSettings',
  type: 'document',
  title: 'Shop Settings',
  icon: CartIcon,
  fields: [
    { name: 'enabled', type: 'boolean', title: 'Shop Enabled', initialValue: false },
    { name: 'heading', type: 'string', title: 'Shop Page Heading' },
    { name: 'description', type: 'array', title: 'Shop Description',
      of: [{ type: 'block' }] },
    { name: 'shippingNote', type: 'text', title: 'Shipping Info', rows: 3 },
    { name: 'turnaroundTime', type: 'string', title: 'Turnaround Time',
      description: 'e.g., "2-3 weeks"' },
    { name: 'stripeEnabled', type: 'boolean', title: 'Stripe Payments Active',
      initialValue: false },
    { name: 'featuredPrints', type: 'array', title: 'Featured Prints',
      of: [{ type: 'reference', to: [{ type: 'gallery' }] }],
      description: 'Galleries to feature in the shop' }
  ]
}
```

### 7. `contactPage` (singleton)

```ts
{
  name: 'contactPage',
  type: 'document',
  title: 'Contact / Booking',
  icon: EnvelopeIcon,
  fields: [
    { name: 'heading', type: 'string', title: 'Page Heading' },
    { name: 'intro', type: 'array', title: 'Introduction Text',
      of: [{ type: 'block' }] },
    { name: 'email', type: 'string', title: 'Contact Email' },
    { name: 'phone', type: 'string', title: 'Phone (optional)' },
    { name: 'bookingEnabled', type: 'boolean', title: 'Show Booking Form',
      initialValue: true },
    { name: 'bookingTypes', type: 'array', title: 'Session Types',
      of: [{ type: 'object', fields: [
        { name: 'name', type: 'string' },                                    // "Portrait Session"
        { name: 'duration', type: 'string' },                                // "2 hours"
        { name: 'startingPrice', type: 'number' },                          // 250
        { name: 'description', type: 'text', rows: 2 }
      ]}]
    },
    { name: 'seo', type: 'object', title: 'SEO', fields: [
      { name: 'description', type: 'text', rows: 2 }
    ]}
  ]
}
```

### 8. `inquiry` (read-only, created by form submissions)

```ts
{
  name: 'inquiry',
  type: 'document',
  title: 'Inquiry',
  icon: InboxIcon,
  readOnly: true,
  fields: [
    { name: 'name', type: 'string', title: 'Name' },
    { name: 'email', type: 'string', title: 'Email' },
    { name: 'phone', type: 'string', title: 'Phone' },
    { name: 'sessionType', type: 'string', title: 'Session Type' },
    { name: 'message', type: 'text', title: 'Message' },
    { name: 'preferredDate', type: 'date', title: 'Preferred Date' },
    { name: 'status', type: 'string', title: 'Status',
      options: { list: ['new', 'contacted', 'booked', 'completed', 'cancelled'] },
      initialValue: 'new' },
    { name: 'notes', type: 'text', title: 'Internal Notes',
      description: 'Private notes (not shown to client)' },
    { name: 'submittedAt', type: 'datetime', title: 'Submitted' }
  ],
  orderings: [
    { title: 'Newest First', name: 'newest', by: [{ field: 'submittedAt', direction: 'desc' }] }
  ],
  preview: {
    select: { name: 'name', type: 'sessionType', status: 'status', date: 'submittedAt' },
    prepare: ({ name, type, status, date }) => ({
      title: name,
      subtitle: `${type || 'General'} · ${status} · ${new Date(date).toLocaleDateString()}`
    })
  }
}
```

---

## Studio Dashboard Structure

### Desk Structure (sidebar navigation)

```
📸 Reflecting Pool Studio
├── 🏠 Dashboard (custom home screen)
├── ─── Content ───
│   ├── 🖼️ Galleries          → list of gallery documents, drag to reorder
│   ├── 👤 About               → singleton editor
│   └── 📬 Contact & Booking   → singleton editor
├── ─── Shop ───
│   ├── 🛒 Shop Settings       → singleton editor
│   └── 📐 Print Sizes         → list of print sizes
├── ─── Inquiries ───
│   ├── 🔴 New Inquiries       → filtered: status == 'new'
│   ├── 📋 All Inquiries       → full list, newest first
├── ─── Settings ───
│   ├── ⚙️ Site Settings       → singleton editor
│   └── 🎨 Theme               → color pickers, caustic video upload
```

### Custom Dashboard (home screen)

A clean overview when the studio loads:

```
┌─────────────────────────────────────────────────────┐
│  📸 Reflecting Pool                                  │
│  Margaret Helena Photography                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    5     │  │    34    │  │    3     │          │
│  │ Galleries│  │  Photos  │  │  New     │          │
│  │          │  │          │  │ Inquiries│          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  Recent Inquiries                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ Jane Smith · Portrait Session · Apr 2 · 🔴 new│  │
│  │ Mike R. · Wedding · Apr 1 · 🟢 contacted      │  │
│  │ Sarah T. · Print Order · Mar 30 · ✅ completed │  │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Quick Actions                                       │
│  [ + New Gallery ]  [ View Site ↗ ]  [ Shop ⚙️ ]    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Dashboard Widgets
1. **Stats cards** — Gallery count, total photos, new inquiries (badge with count)
2. **Recent inquiries** — Last 5, with status indicators, click to open
3. **Quick actions** — Create gallery, view live site, shop settings
4. **Site preview** — Small thumbnail/link of the live site

---

## GROQ Queries (for the frontend)

### Homepage — fetch all visible galleries with images
```groq
*[_type == "gallery" && isVisible == true] | order(sortOrder asc) {
  _id,
  title,
  slug,
  description,
  depth,
  coverImage { asset-> { url, metadata { dimensions } } },
  images[] {
    image { asset-> { url, metadata { dimensions, lqip } } },
    caption,
    alt,
    depth,
    printAvailable
  }
}
```

### About page
```groq
*[_type == "aboutPage"][0] {
  heading,
  portrait { asset-> { url } },
  bio,
  artistStatement,
  highlights
}
```

### Site settings
```groq
*[_type == "siteSettings"][0] {
  artistName,
  siteTitle,
  tagline,
  headerBackground,
  pageBackground,
  causticVideo { asset-> { url } },
  socialLinks,
  seo
}
```

---

## Notes

- **Singletons** (siteSettings, aboutPage, shopSettings, contactPage) should use the singleton document pattern — one document, no create/delete
- **Image optimization**: Use Sanity's image CDN with `?w=500&auto=format` for gallery thumbnails
- **LQIP**: Low-quality image placeholders from Sanity metadata for loading states
- **Inquiry form** submits via API route → creates Sanity document + sends email notification
- **Stripe integration** for print shop is future work — schema is ready for it

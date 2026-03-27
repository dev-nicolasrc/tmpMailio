export function buildBreadcrumbSchema(locale: string, pageName: string, pageSlug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TmpMail",
        item: `https://tmpmailio.com/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: `https://tmpmailio.com/${locale}/${pageSlug}`,
      },
    ],
  }
}

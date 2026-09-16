export const GOOGLE_ADS_TAG_ID = "AW-18454017501";

export function googleTag() {
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GOOGLE_ADS_TAG_ID}');
</script>`;
}

export function injectGoogleTag(html) {
  const loader = `googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`;
  if (html.includes(loader)) return html;
  if (!html.includes("</head>")) throw new Error("Cannot inject the Google tag without a closing head element");
  return html.replace("</head>", `${googleTag()}\n  </head>`);
}

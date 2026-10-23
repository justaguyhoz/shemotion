const api = "/api/admin/instagram";
const notice = document.querySelector("[data-notice]");
const postsRoot = document.querySelector("[data-posts]");
const form = document.querySelector("[data-gallery-form]");
let state;
let uploads = 0;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The update could not be completed. Please try again.");
  return data;
}
const jsonRequest = (method, input) => request(api, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
function message(text) { notice.textContent = text; }

function row(post = { title: "", url: "", imageUrl: "" }) {
  const card = document.createElement("article"); card.className = "instagram-post";
  // All supplied values are assigned via DOM properties, never interpolated HTML.
  card.innerHTML = '<img alt="Instagram cover preview"><label>Post or reel link<input name="postUrl" type="url" required maxlength="500"></label><label>Image description<input name="postTitle" maxlength="220" required></label><label>Cover image<input name="cover" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="field-help" role="status"></p><div class="instagram-actions"><button type="button" class="text-button" data-up>Move up</button><button type="button" class="text-button" data-remove>Remove</button></div>';
  const image = card.querySelector("img"); image.src = post.imageUrl || "/assets/shemotion-logo.png";
  card.dataset.imageUrl = post.imageUrl;
  card.querySelector('[name="postUrl"]').value = post.url;
  card.querySelector('[name="postTitle"]').value = post.title;
  card.querySelector("[data-remove]").addEventListener("click", () => card.remove());
  card.querySelector("[data-up]").addEventListener("click", () => { if (card.previousElementSibling) postsRoot.insertBefore(card, card.previousElementSibling); });
  card.querySelector('[name="cover"]').addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const status = card.querySelector('[role="status"]');
    uploads++; document.querySelector("[data-save-gallery]").disabled = true;
    try {
      status.textContent = "Uploading…";
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WebP of 8 MB or smaller.");
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1, 480 / bitmap.width, 640 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const cover = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.84));
      if (!cover) throw new Error("The cover could not be prepared. Try another image.");
      const body = new FormData(); body.append("image", cover, "instagram-cover.webp");
      const data = await request("/api/admin/media-feature-images", { method: "POST", body });
      card.dataset.imageUrl = data.url; image.src = data.url;
      status.textContent = "Uploaded. Save the gallery to publish this cover.";
    } catch (error) { status.textContent = error.message; }
    finally { uploads--; document.querySelector("[data-save-gallery]").disabled = uploads > 0; }
  });
  return card;
}

function showState(next, replacePosts = true) {
  state = next;
  document.querySelector("[data-connection]").textContent = next.connected ? "Instagram API credentials configured. Refresh to verify the account connection." : "Automatic connection not configured.";
  document.querySelector("[data-updated]").textContent = `Gallery updated: ${new Date(next.updatedAt).toLocaleString()}. ${next.source}.`;
  document.querySelector("[data-setup]").hidden = next.connected;
  const automatic = document.querySelector("[data-automatic]"); automatic.checked = next.automatic; automatic.disabled = !next.storageAvailable || (!next.connected && !next.automatic);
  document.querySelector("[data-refresh]").disabled = !next.connected || !next.storageAvailable;
  document.querySelector("[data-save-settings]").disabled = !next.storageAvailable;
  document.querySelector("[data-save-gallery]").disabled = !next.storageAvailable;
  document.querySelector("[data-add]").disabled = !next.storageAvailable;
  if (replacePosts) postsRoot.replaceChildren(...next.posts.map(row));
  if (next.lastError) message(`Last automatic refresh: ${next.lastError}`);
}

document.querySelector("[data-add]").addEventListener("click", () => {
  if (postsRoot.children.length >= 12) { message("You can show up to 12 posts."); return; }
  postsRoot.append(row());
});
document.querySelector("[data-save-settings]").addEventListener("click", async (event) => {
  event.target.disabled = true;
  try { showState(await jsonRequest("PUT", { automatic: document.querySelector("[data-automatic]").checked }), false); message("Refresh setting saved."); }
  catch (error) { message(error.message); }
  finally { event.target.disabled = false; }
});
document.querySelector("[data-refresh]").addEventListener("click", async (event) => {
  event.target.disabled = true; message("Refreshing account posts and saving their covers…");
  try { showState(await jsonRequest("POST", {})); message("Gallery refreshed from @shemotion.au."); }
  catch (error) { message(error.message); }
  finally { event.target.disabled = !state?.connected; }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!form.reportValidity() || uploads) return;
  const posts = [...postsRoot.children].map(card => ({ url: card.querySelector('[name="postUrl"]').value, title: card.querySelector('[name="postTitle"]').value, imageUrl: card.dataset.imageUrl }));
  const button = document.querySelector("[data-save-gallery]"); button.disabled = true;
  try { showState(await jsonRequest("PUT", { posts }), false); message(`Gallery saved. The website now uses these posts.${state.automatic ? ' Automatic refresh will replace this selection on its next check.' : ''}`); }
  catch (error) { message(error.message); }
  finally { button.disabled = false; }
});
request(api).then(data => { showState(data); if (!data.lastError) message("Gallery loaded."); }).catch(error => message(error.message));

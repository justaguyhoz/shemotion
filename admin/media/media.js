const list = document.querySelector("[data-media-list]");
const notice = document.querySelector("[data-notice]");
const dialog = document.querySelector("[data-media-dialog]");
const form = document.querySelector("[data-media-form]");
const formError = document.querySelector("[data-form-error]");
const deleteButton = document.querySelector("[data-delete]");
const imageFile = document.querySelector("[data-image-file]");
const imageUpload = document.querySelector("[data-image-upload]");
const imageStatus = document.querySelector("[data-image-status]");
let items = [];

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  return node;
}

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("is-error", isError);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details) ? ` ${data.details.join(" ")}` : "";
    throw new Error(`${data.error || "The request failed."}${details}`);
  }
  return data;
}

function statusText(item) {
  const values = [item.status === "published" ? "Published" : "Draft"];
  if (item.isFeatured) values.push("Homepage");
  return values.join(" · ");
}

function renderItems() {
  list.replaceChildren();
  if (!items.length) {
    list.append(element("p", { className: "empty-state", text: "No media items yet. Add an article, podcast or interview when it is ready." }));
    return;
  }
  items.forEach((item) => {
    const card = element("article", { className: "media-admin-card" });
    const button = element("button", { className: "media-admin-button" });
    button.type = "button";
    button.setAttribute("aria-label", `Edit ${item.title}`);
    const thumbnail = element("span", { className: "media-admin-thumbnail" });
    if (item.thumbnailUrl) {
      const image = element("img");
      image.src = item.thumbnailUrl;
      image.alt = item.imageAlt || "";
      thumbnail.append(image);
    } else {
      thumbnail.textContent = item.publisher;
    }
    const content = element("span", { className: "media-admin-content" });
    content.append(
      element("span", { className: `status ${item.status === "draft" ? "draft" : ""}`, text: statusText(item) }),
      element("h3", { text: item.title }),
      element("p", { text: `${item.publisher} · ${item.mediaType}` }),
      element("span", { className: "admin-event-edit", text: "Edit item" })
    );
    button.append(thumbnail, content);
    button.addEventListener("click", () => openForm(item));
    card.append(button);
    list.append(card);
  });
}

function updateImagePreview() {
  const wrap = document.querySelector("[data-image-preview-wrap]");
  const image = document.querySelector("[data-image-preview]");
  const value = form.elements.thumbnailUrl.value.trim();
  if (!value) {
    image.removeAttribute("src");
    wrap.hidden = true;
    return;
  }
  image.src = value;
  image.alt = form.elements.imageAlt.value.trim() || "Thumbnail preview";
  wrap.hidden = false;
}

function openForm(item = null) {
  form.reset();
  formError.textContent = "";
  imageStatus.textContent = "";
  imageFile.value = "";
  imageUpload.disabled = true;
  form.elements.id.value = item?.id || "";
  for (const name of ["title", "publisher", "mediaType", "externalUrl", "shortDescription", "thumbnailUrl", "imageAlt", "publicationDate", "contributionType", "status", "displayOrder"]) {
    if (item) form.elements[name].value = item[name] ?? "";
  }
  form.elements.mediaType.value ||= "article";
  form.elements.contributionType.value ||= "written_by_katty";
  form.elements.status.value ||= "draft";
  form.elements.displayOrder.value ||= "0";
  form.elements.isFeatured.checked = Boolean(item?.isFeatured);
  document.querySelector("[data-form-title]").textContent = item ? "Edit Media Item" : "Add Media Item";
  deleteButton.hidden = !item;
  updateImagePreview();
  dialog.showModal();
  form.elements.title.focus();
}

function payload() {
  const data = new FormData(form);
  return {
    title: data.get("title"), publisher: data.get("publisher"), mediaType: data.get("mediaType"),
    externalUrl: data.get("externalUrl"), shortDescription: data.get("shortDescription"),
    thumbnailUrl: data.get("thumbnailUrl"), imageAlt: data.get("imageAlt"),
    publicationDate: data.get("publicationDate"), contributionType: data.get("contributionType"),
    status: data.get("status"), isFeatured: data.get("isFeatured") === "on",
    displayOrder: Number(data.get("displayOrder") || 0),
  };
}

async function optimisedUpload(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const dimensions = { width: image.width, height: image.height };
  image.close();
  const prepared = await new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" })) : reject(new Error("The image could not be prepared.")),
    "image/webp", .88
  ));
  return { prepared, dimensions };
}

async function uploadImage() {
  const selected = imageFile.files?.[0];
  if (!selected) return;
  imageUpload.disabled = true;
  imageStatus.textContent = "Preparing image...";
  try {
    const { prepared, dimensions } = await optimisedUpload(selected);
    const body = new FormData();
    body.append("image", prepared);
    imageStatus.textContent = "Uploading image...";
    const response = await fetch("../../api/admin/media-feature-images", { method: "POST", body, headers: { accept: "application/json" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The image could not be uploaded.");
    form.elements.thumbnailUrl.value = result.url;
    if (!form.elements.imageAlt.value.trim()) form.elements.imageAlt.value = `${form.elements.publisher.value.trim() || "Publisher"} logo`;
    const sizeNote = dimensions.width < 300 || dimensions.height < 300 ? " The source is below the recommended 300 × 300 pixels." : "";
    imageStatus.textContent = `Image uploaded. Save the item to use it.${sizeNote}`;
    updateImagePreview();
  } catch (error) {
    imageStatus.textContent = error.message;
  } finally {
    imageUpload.disabled = false;
  }
}

async function loadItems() {
  try {
    const data = await apiRequest("../../api/admin/media-features");
    items = data.items;
    renderItems();
    setNotice(`${items.length} media item${items.length === 1 ? "" : "s"}.`);
  } catch (error) {
    list.replaceChildren(element("p", { className: "empty-state", text: "Media items could not be loaded." }));
    setNotice(error.message, true);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  if (!form.reportValidity()) return;
  const id = form.elements.id.value;
  try {
    await apiRequest(id ? `../../api/admin/media-features/${id}` : "../../api/admin/media-features", {
      method: id ? "PUT" : "POST", body: JSON.stringify(payload()),
    });
    dialog.close();
    setNotice(id ? "Media item updated." : "Media item created.");
    await loadItems();
  } catch (error) {
    formError.textContent = error.message;
  }
});

deleteButton.addEventListener("click", async () => {
  const id = form.elements.id.value;
  const title = form.elements.title.value;
  if (!id || !window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await apiRequest(`../../api/admin/media-features/${id}`, { method: "DELETE" });
    dialog.close();
    setNotice("Media item deleted.");
    await loadItems();
  } catch (error) {
    formError.textContent = error.message;
  }
});

document.querySelector("[data-new-media]").addEventListener("click", () => openForm());
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
imageFile.addEventListener("change", () => {
  imageUpload.disabled = !imageFile.files?.length;
  imageStatus.textContent = imageFile.files?.length ? `${imageFile.files[0].name} selected.` : "";
});
imageUpload.addEventListener("click", uploadImage);
document.querySelector("[data-image-remove]").addEventListener("click", () => {
  form.elements.thumbnailUrl.value = "";
  form.elements.imageAlt.value = "";
  imageFile.value = "";
  imageStatus.textContent = "Thumbnail removed. Save the item to confirm.";
  updateImagePreview();
});
form.elements.imageAlt.addEventListener("input", updateImagePreview);

loadItems();

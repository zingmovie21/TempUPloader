const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const progressBar = document.getElementById("progressBar");
const statusMessage = document.getElementById("statusMessage");
const fileUrl = document.getElementById("fileUrl");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!fileInput.files.length) {
    statusMessage.textContent = "Please select a file to upload.";
    statusMessage.classList.add("text-danger");
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);

  statusMessage.textContent = "Uploading...";
  statusMessage.classList.remove("text-danger", "text-success");
  statusMessage.classList.add("text-warning");

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      statusMessage.textContent = result.message;
      statusMessage.classList.remove("text-warning");
      statusMessage.classList.add("text-success");
      fileUrl.innerHTML = `<a href="${result.url}" target="_blank">${result.url}</a>`;
      progressBar.style.width = "100%";
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    statusMessage.textContent = `Failed to upload: ${err.message}`;
    statusMessage.classList.remove("text-warning");
    statusMessage.classList.add("text-danger");
    progressBar.style.width = "0%";
  }
});

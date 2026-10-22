

const imageInput = document.getElementById("imageInput");
const uploadBox = document.getElementById("uploadBox");
const chooseBtn = document.getElementById("chooseBtn");
const previewSection = document.getElementById("previewSection");
const previewImage = document.getElementById("previewImage");
const removeBtn = document.getElementById("removeBtn");
const extractBtn = document.getElementById("extractBtn");
const outputText = document.getElementById("outputText");
const language = document.getElementById("language");

const progressSection = document.getElementById("progressSection");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const statusText = document.getElementById("statusText");
const message = document.getElementById("message");

const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");

let selectedFile = null;
let imageURL = null;
let busy = false;

chooseBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  imageInput.click();
});

uploadBox.addEventListener("click", () => imageInput.click());

uploadBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    imageInput.click();
  }
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) handleImage(file);
});

["dragenter", "dragover"].forEach(type => {
  uploadBox.addEventListener(type, event => {
    event.preventDefault();
    uploadBox.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(type => {
  uploadBox.addEventListener(type, event => {
    event.preventDefault();
    uploadBox.classList.remove("dragging");
  });
});

uploadBox.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];
  if (file) handleImage(file);
});

function showMessage(text, type = "success") {
  message.textContent = text;
  message.className = "message " + type;
}

function hideMessage() {
  message.textContent = "";
  message.className = "message hidden";
}

function handleImage(file) {
  if (busy) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    showMessage("Please select a JPG, PNG or WEBP image.", "error");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showMessage("Image must be smaller than 10 MB.", "error");
    return;
  }

  if (imageURL) URL.revokeObjectURL(imageURL);

  selectedFile = file;
  imageURL = URL.createObjectURL(file);

  previewImage.src = imageURL;
  previewSection.classList.remove("hidden");
  extractBtn.disabled = false;

  outputText.value = "";
  updateCounts();
  hideMessage();
}

removeBtn.addEventListener("click", () => {
  if (busy) return;

  selectedFile = null;
  imageInput.value = "";
  previewImage.removeAttribute("src");
  previewSection.classList.add("hidden");
  extractBtn.disabled = true;

  if (imageURL) {
    URL.revokeObjectURL(imageURL);
    imageURL = null;
  }

  hideMessage();
});

extractBtn.addEventListener("click", async () => {
  if (!selectedFile || busy) return;

  if (!window.Tesseract) {
    showMessage(
      "OCR library could not load. Check your internet connection and reload the page.",
      "error"
    );
    return;
  }

  busy = true;
  extractBtn.disabled = true;
  chooseBtn.disabled = true;
  progressSection.classList.remove("hidden");
  hideMessage();

  outputText.value = "";
  updateCounts();

  try {
    const result = await Tesseract.recognize(
      selectedFile,
      language.value,
      {
        logger: info => {
          if (info.status) {
            statusText.textContent = info.status;
          }

          if (typeof info.progress === "number") {
            const percent = Math.round(info.progress * 100);
            progressBar.style.width = percent + "%";
            progressPercent.textContent = percent + "%";
          }
        }
      }
    );

    outputText.value = result.data.text.trim();
    updateCounts();

    if (outputText.value) {
      showMessage("Text extracted successfully!", "success");
    } else {
      showMessage(
        "No text detected. Try a clearer image or select the correct language.",
        "error"
      );
    }
  } catch (error) {
    console.error(error);

    showMessage(
      "Could not extract text. Check your internet connection and try again.",
      "error"
    );
  } finally {
    busy = false;
    extractBtn.disabled = !selectedFile;
    chooseBtn.disabled = false;
    progressSection.classList.add("hidden");
  }
});

function updateCounts() {
  const text = outputText.value;

  charCount.textContent = text.length + " characters";

  const words = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  wordCount.textContent = words + " words";
}

outputText.addEventListener("input", updateCounts);

copyBtn.addEventListener("click", async () => {
  const text = outputText.value;

  if (!text.trim()) {
    showMessage("There is no text to copy.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showMessage("Text copied! Now you can paste it anywhere.");
  } catch (error) {
    outputText.focus();
    outputText.select();

    try {
      const copied = document.execCommand("copy");

      if (copied) {
        showMessage("Text copied successfully!");
      } else {
        showMessage("Copy failed. Select the text and press Ctrl+C or Cmd+C.", "error");
      }
    } catch {
      showMessage("Select the text and press Ctrl+C or Cmd+C.", "error");
    }
  }
});

downloadBtn.addEventListener("click", () => {
  const text = outputText.value;

  if (!text.trim()) {
    showMessage("There is no text to download.", "error");
    return;
  }

  const blob = new Blob(["\uFEFF", text], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "extracted-text.txt";
  link.click();

  URL.revokeObjectURL(url);
  showMessage("Text file downloaded.");
});

clearBtn.addEventListener("click", () => {
  if (busy) return;

  outputText.value = "";
  updateCounts();
  hideMessage();
});


const SUPABASE_URL = "https://xzzprmezmjknlxsjbyxw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rGCe4SYeeEssLKkxuTsVVA_IB3nFL9N";
const WHATSAPP_NUMBER = "254116990560";
const BUSINESS_PHONE = "";
const STORAGE_BUCKET = "product-images";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let products = [];
let cart = [];
let activeCategory = "All";
let currentUser = null;

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");

const money = amount =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(message, isError = false) {
  const element = document.getElementById("formMessage");
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "#354b39";
}

// LOAD PRODUCTS
async function loadProducts() {
  if (!grid) return;

  grid.innerHTML = '<p class="empty-state">Loading furniture...</p>';

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = '<p class="empty-state">Unable to load furniture.</p>';
    return;
  }

  products = data || [];
  renderProducts();
  renderManagedProducts();
}

// DISPLAY PRODUCTS
function renderProducts() {
  if (!grid) return;

  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const visible = products.filter(product => {
    const categoryMatch =
      activeCategory === "All" || product.category === activeCategory;

    const searchMatch =
      String(product.name || "").toLowerCase().includes(query) ||
      String(product.category || "").toLowerCase().includes(query);

    return categoryMatch && searchMatch;
  });

  if (!visible.length) {
    grid.innerHTML = '<p class="empty-state">No furniture found.</p>';
    return;
  }

  grid.innerHTML = visible.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.image_url
          ? `<img src="${escapeHtml(product.image_url)}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
              onerror="this.style.display='none';">`
          : '<p>No picture available</p>'}
      </div>
      <div class="product-info">
        <span class="product-category">
          ${escapeHtml(product.category || "Furniture")}
        </span>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="product-bottom">
          <span class="price">${money(product.price)}</span>
          <button class="add-btn"
            data-id="${escapeHtml(product.id)}"
            aria-label="Enquire about ${escapeHtml(product.name)}">+</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".add-btn").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.id));
  });
}

// CUSTOMER ENQUIRIES
function addToCart(id) {
  const product = products.find(item => String(item.id) === String(id));
  if (!product) return;

  cart.push(product);

  const count = document.getElementById("cartCount");
  if (count) count.textContent = cart.length;

  const toast = document.getElementById("toast");
  if (toast) {
    toast.textContent = product.name + " added to your enquiry list.";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }
}

// CATEGORY FILTERS
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    activeCategory = button.dataset.category;
    renderProducts();
  });
});

// SEARCH
if (searchInput) {
  searchInput.addEventListener("input", renderProducts);
}

// PRODUCT MANAGER
const managerPanel = document.getElementById("managerPanel");
const toggleManager = document.getElementById("toggleManager");

if (managerPanel) {
  managerPanel.insertAdjacentHTML("afterbegin", `
    <div class="admin-login" id="adminLogin">
      <h3>Administrator Login</h3>
      <p>Log in to manage Happy Time Furniture products.</p>
      <form id="adminLoginForm">
        <input type="email" id="adminEmail"
          placeholder="Administrator email" required>
        <input type="password" id="adminPassword"
          placeholder="Administrator password" required>
        <button class="button primary" type="submit">
          Login to manage products
        </button>
      </form>
      <p id="loginMessage" role="status"></p>
    </div>
    <div id="adminDashboard" hidden>
      <div class="admin-status">
        <span>Administrator is logged in.</span>
        <button class="button secondary" type="button" id="adminLogout">
          Logout
        </button>
      </div>
    </div>
  `);
}

function updateAdminView() {
  const login = document.getElementById("adminLogin");
  const dashboard = document.getElementById("adminDashboard");
  const form = document.getElementById("productForm");

  if (!login || !dashboard) return;

  login.hidden = !!currentUser;
  dashboard.hidden = !currentUser;

  if (form) form.hidden = !currentUser;

  const warning = document.querySelector(".manager-warning");
  if (warning) {
    warning.textContent = currentUser
      ? "You are logged in. Products and pictures are saved online."
      : "Please log in with your administrator account.";
  }

  renderManagedProducts();
}

// ADMIN LOGIN
const loginForm = document.getElementById("adminLoginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const message = document.getElementById("loginMessage");

    message.textContent = "Logging in...";

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      message.textContent = "Login failed. Check your email and password.";
      console.error(error);
      return;
    }

    currentUser = data.user;
    message.textContent = "Login successful.";
    updateAdminView();
    await loadProducts();
  });
}

// ADMIN LOGOUT
document.addEventListener("click", async event => {
  if (event.target.id !== "adminLogout") return;

  const { error } = await db.auth.signOut();

  if (error) {
    alert("Could not log out. Please try again.");
    return;
  }

  currentUser = null;
  updateAdminView();
  await loadProducts();
});

// CHECK LOGIN SESSION
async function checkAdminSession() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  currentUser = data.session?.user || null;
  updateAdminView();
}

db.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  updateAdminView();
});

// IMAGE PREVIEW
const imageInput = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");

if (imageInput && imagePreview) {
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) {
      imagePreview.hidden = true;
      return;
    }

    if (!file.type.startsWith("image/")) {
      showMessage("Please select an image file.", true);
      imageInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Choose an image smaller than 5 MB.", true);
      imageInput.value = "";
      return;
    }

    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
  });
}

// ADD PRODUCT AND UPLOAD PICTURE
const productForm = document.getElementById("productForm");

if (productForm) {
  productForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("Please log in first.", true);
      return;
    }

    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const category = document.getElementById("productCategory").value;
    const file = imageInput.files[0];

    if (!name || !Number.isFinite(price) || price <= 0 || !file) {
      showMessage("Complete all fields and select a picture.", true);
      return;
    }

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showMessage("Choose a valid image smaller than 5 MB.", true);
      return;
    }

    const button = document.getElementById("saveProductBtn");
    button.disabled = true;
    button.textContent = "Uploading picture...";

    let imagePath = null;

    try {
      const extension = file.name.split(".").pop().toLowerCase();

      imagePath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await db.storage
        .from(STORAGE_BUCKET)
        .upload(imagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: imageData } = db.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(imagePath);

      const { error: insertError } = await db
        .from("products")
        .insert({
          name,
          price,
          category,
          description: "",
          image_url: imageData.publicUrl,
          image_path: imagePath
        });

      if (insertError) throw insertError;

      showMessage("Product and picture saved successfully!");
      productForm.reset();
      imagePreview.hidden = true;
      await loadProducts();

    } catch (error) {
      console.error(error);

      if (imagePath) {
        await db.storage.from(STORAGE_BUCKET).remove([imagePath]);
      }

      showMessage(error.message || "Could not save product.", true);

    } finally {
      button.disabled = false;
      button.textContent = "Add product";
    }
  });
}

// SHOW MANAGED PRODUCTS
function renderManagedProducts() {
  const container = document.getElementById("managedProductsList");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = "<p>Log in to manage your products.</p>";
    return;
  }

  if (!products.length) {
    container.innerHTML = "<p>No products have been added yet.</p>";
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="managed-row">
      <img src="${escapeHtml(product.image_url || "")}"
        alt="${escapeHtml(product.name)}">
      <div class="managed-row-info">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${money(product.price)} · ${escapeHtml(product.category)}</span>
      </div>
      <button class="remove-managed"
        data-delete="${escapeHtml(product.id)}" type="button">
        Delete
      </button>
    </div>
  `).join("");
}

// DELETE PRODUCT AND PICTURE
document.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  const id = button.dataset.delete;
  const product = products.find(item => String(item.id) === String(id));

  if (!product) return;

  if (!confirm(`Are you sure you want to delete ${product.name}?`)) {
    return;
  }

  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    const { error } = await db
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (product.image_path) {
      const { error: imageError } = await db.storage
        .from(STORAGE_BUCKET)
        .remove([product.image_path]);

      if (imageError) console.error(imageError);
    }

    await loadProducts();
    showMessage("Product deleted successfully.");

  } catch (error) {
    console.error(error);
    alert("Could not delete product. Please try again.");
    button.disabled = false;
    button.textContent = "Delete";
  }
});

// EXPORT PRODUCT BACKUP
const exportButton = document.getElementById("exportProducts");

if (exportButton) {
  exportButton.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please log in first.");
      return;
    }

    const file = new Blob(
      [JSON.stringify(products, null, 2)],
      { type: "application/json" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "happy-time-furniture-backup.json";
    link.click();

    URL.revokeObjectURL(link.href);
  });
}

// OPEN/CLOSE MANAGER
if (toggleManager && managerPanel) {
  toggleManager.addEventListener("click", () => {
    managerPanel.hidden = !managerPanel.hidden;

    toggleManager.textContent = managerPanel.hidden
      ? "Open product manager"
      : "Close product manager";
  });
}

// MOBILE MENU
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll("#nav a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// WHATSAPP
const whatsappLink = document.getElementById("whatsappLink");

if (whatsappLink) {
  whatsappLink.href =
    "https://wa.me/" + WHATSAPP_NUMBER +
    "?text=" +
    encodeURIComponent(
      "Hello Happy Time Furniture, I would like to enquire about your furniture."
    );
}

// BUSINESS PHONE
const phoneDisplay = document.getElementById("phoneDisplay");

if (phoneDisplay) {
  phoneDisplay.textContent =
    BUSINESS_PHONE || "Contact Happy Time Furniture";
}

// FOOTER YEAR
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

// START WEBSITE
async function startWebsite() {
  await checkAdminSession();
  await loadProducts();
}

startWebsite();

setInterval(loadProducts, 60000);

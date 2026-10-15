
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. KONFIGURASI DAN STATE APLIKASI
  // ==========================================

  const STORAGE_KEY = "taskflow_mahasiswa_v1";

  const CATEGORIES = [
    "Individu",
    "Kelompok",
    "Praktikum",
    "Kuis",
    "Proyek Akhir",
    "Tugas Rutin"
  ];

  const STATUSES = [
    "Belum Dikerjakan",
    "Proses",
    "Selesai"
  ];

  const PRIORITIES = ["Tinggi", "Sedang", "Rendah"];

  let tasks = loadTasks();
  let currentView = "all";
  let currentCategory = "all";
  let currentQuickFilter = "all";
  let toastCounter = 0;

  // ==========================================
  // 2. MENGAMBIL ELEMEN DOM
  // ==========================================

  const $ = (selector) => document.querySelector(selector);

  const taskList = $("#taskList");
  const emptyState = $("#emptyState");
  const taskForm = $("#taskForm");
  const taskDialog = $("#taskDialog");

  const searchInput = $("#searchInput");
  const categoryFilter = $("#categoryFilter");
  const statusFilter = $("#statusFilter");
  const priorityFilter = $("#priorityFilter");
  const sortFilter = $("#sortFilter");

  const taskIdInput = $("#taskId");
  const taskTitleInput = $("#taskTitle");
  const courseInput = $("#course");
  const categoryInput = $("#category");
  const priorityInput = $("#priority");
  const statusInput = $("#status");
  const deadlineInput = $("#deadline");
  const descriptionInput = $("#description");

  // ==========================================
  // 3. LOCAL STORAGE
  // ==========================================

  function loadTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return [];

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) return [];

      // Abaikan data yang strukturnya tidak valid.
      return parsed.filter((task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.course === "string" &&
        CATEGORIES.includes(task.category) &&
        PRIORITIES.includes(task.priority) &&
        STATUSES.includes(task.status) &&
        typeof task.deadline === "string" &&
        !Number.isNaN(Date.parse(task.deadline))
      );
    } catch (error) {
      console.error("Gagal membaca localStorage:", error);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan tugas:", error);

      showToast(
        "Data gagal disimpan. Periksa kapasitas penyimpanan browser.",
        "error"
      );

      return false;
    }
  }

  // ==========================================
  // 4. HELPER DAN FORMAT DATA
  // ==========================================

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function normalizeText(value) {
    return String(value ?? "")
      .toLocaleLowerCase("id-ID")
      .trim();
  }

  function slugify(value) {
    return value.toLowerCase().replace(/\s+/g, "-");
  }

  function getDeadlineDate(deadline) {
    const date = new Date(deadline);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfDay(date = new Date()) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function isSameDay(first, second) {
    return first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function formatDateTime(date) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(date);
  }

  function getRemainingTime(deadline) {
    const difference = deadline.getTime() - Date.now();

    if (difference < 0) {
      const elapsed = Math.abs(difference);
      const days = Math.floor(elapsed / 86400000);
      const hours = Math.floor((elapsed % 86400000) / 3600000);

      if (days > 0) return `Terlambat ${days} hari`;
      if (hours > 0) return `Terlambat ${hours} jam`;

      return "Terlambat kurang dari 1 jam";
    }

    if (difference < 3600000) {
      const minutes = Math.max(1, Math.ceil(difference / 60000));
      return `${minutes} menit lagi`;
    }

    if (difference < 86400000) {
      const hours = Math.floor(difference / 3600000);
      const minutes = Math.floor(
        (difference % 3600000) / 60000
      );

      return minutes > 0
        ? `${hours} jam ${minutes} menit lagi`
        : `${hours} jam lagi`;
    }

    const days = Math.ceil(difference / 86400000);
    return `${days} hari lagi`;
  }

  function isOverdue(task) {
    const deadline = getDeadlineDate(task.deadline);

    return Boolean(
      deadline &&
      task.status !== "Selesai" &&
      deadline.getTime() < Date.now()
    );
  }

  function isDueSoon(task) {
    const deadline = getDeadlineDate(task.deadline);
    const difference = deadline
      ? deadline.getTime() - Date.now()
      : Infinity;

    return Boolean(
      deadline &&
      task.status !== "Selesai" &&
      difference >= 0 &&
      difference <= 24 * 60 * 60 * 1000
    );
  }

  function isToday(task) {
    const deadline = getDeadlineDate(task.deadline);

    return Boolean(
      deadline &&
      isSameDay(deadline, new Date())
    );
  }

  function isUpcoming(task) {
    const deadline = getDeadlineDate(task.deadline);

    return Boolean(
      deadline &&
      startOfDay(deadline) > startOfDay() &&
      task.status !== "Selesai"
    );
  }

  function getDeadlineLabel(task) {
    const deadline = getDeadlineDate(task.deadline);

    if (!deadline) {
      return {
        label: "Deadline tidak valid",
        detail: "",
        className: "deadline-danger"
      };
    }

    if (task.status === "Selesai") {
      return {
        label: "Tugas selesai",
        detail: formatDateTime(deadline),
        className: "deadline-safe"
      };
    }

    if (isOverdue(task)) {
      return {
        label: getRemainingTime(deadline),
        detail: formatDateTime(deadline),
        className: "deadline-danger"
      };
    }

    if (isDueSoon(task)) {
      return {
        label: `Segera deadline · ${getRemainingTime(deadline)}`,
        detail: formatDateTime(deadline),
        className: "deadline-soon"
      };
    }

    return {
      label: getRemainingTime(deadline),
      detail: formatDateTime(deadline),
      className: "deadline-safe"
    };
  }

  function getTaskById(id) {
    return tasks.find((task) => task.id === id);
  }

  // ==========================================
  // 5. NOTIFIKASI TOAST
  // ==========================================

  function showToast(message, type = "success") {
    const container = $("#toastContainer");
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;

    container.appendChild(toast);

    const id = ++toastCounter;

    // Tanpa timer global: toast dihapus ketika waktunya habis.
    window.setTimeout(() => {
      toast.remove();
    }, 3500);

    return id;
  }

  // ==========================================
  // 6. RENDER KARTU TUGAS
  // ==========================================

  function renderTaskCard(task) {
    const deadline = getDeadlineLabel(task);
    const overdue = isOverdue(task);
    const completed = task.status === "Selesai";

    const cardClasses = [
      "task-card",
      overdue ? "is-overdue" : "",
      completed ? "is-done" : ""
    ].filter(Boolean).join(" ");

    return `
      <article class="${cardClasses}" data-task-id="${escapeHTML(task.id)}">
        <div class="task-card-top">
          <div class="task-badges">
            <span class="badge category-${slugify(task.category)}">
              ${escapeHTML(task.category)}
            </span>
            <span class="badge priority-${slugify(task.priority)}">
              ${task.priority === "Tinggi" ? "●" :
                task.priority === "Sedang" ? "●" : "●"}
              ${escapeHTML(task.priority)}
            </span>
          </div>

          <div class="task-more">
            <button type="button"
              class="task-menu-button"
              data-action="edit"
              data-id="${escapeHTML(task.id)}"
              aria-label="Edit ${escapeHTML(task.title)}"
              title="Edit tugas">✎</button>
          </div>
        </div>

        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        <p class="task-course">${escapeHTML(task.course)}</p>

        ${task.description ? `
          <p class="task-description">${escapeHTML(task.description)}</p>
        ` : ""}

        <div class="task-meta">
          <span class="deadline-icon" aria-hidden="true">◷</span>
          <div class="deadline-copy">
            <strong class="${deadline.className}">
              ${escapeHTML(deadline.label)}
            </strong>
            <span>${escapeHTML(deadline.detail)}</span>
          </div>
        </div>

        <div class="task-bottom">
          <select
            class="status-select status-${slugify(task.status)}"
            data-action="status"
            data-id="${escapeHTML(task.id)}"
            aria-label="Ubah status ${escapeHTML(task.title)}">
            ${STATUSES.map((status) => `
              <option value="${status}"
                ${task.status === status ? "selected" : ""}>
                ${status}
              </option>
            `).join("")}
          </select>

          <div class="task-actions">
            <button type="button"
              class="task-action"
              data-action="edit"
              data-id="${escapeHTML(task.id)}"
              aria-label="Edit tugas ${escapeHTML(task.title)}"
              title="Edit">✎</button>

            <button type="button"
              class="task-action delete"
              data-action="delete"
              data-id="${escapeHTML(task.id)}"
              aria-label="Hapus tugas ${escapeHTML(task.title)}"
              title="Hapus">⌫</button>
          </div>
        </div>
      </article>
    `;
  }

  // ==========================================
  // 7. FILTER DAN PENCARIAN
  // ==========================================

  function getFilteredTasks() {
    const query = normalizeText(searchInput.value);
    const category = categoryFilter.value;
    const status = statusFilter.value;
    const priority = priorityFilter.value;

    let result = tasks.filter((task) => {
      const matchesSearch = [
        task.title,
        task.course,
        task.category,
        task.priority,
        task.status,
        task.description
      ].some((value) => normalizeText(value).includes(query));

      const matchesCategory =
        category === "all" || task.category === category;

      const matchesStatus =
        status === "all" || task.status === status;

      const matchesPriority =
        priority === "all" || task.priority === priority;

      let matchesView = true;

      if (currentView === "today") {
        matchesView = isToday(task) && task.status !== "Selesai";
      } else if (currentView === "upcoming") {
        matchesView = isUpcoming(task);
      } else if (currentView === "completed") {
        matchesView = task.status === "Selesai";
      }

      let matchesCategoryNav = true;

      if (currentCategory !== "all") {
        matchesCategoryNav = task.category === currentCategory;
      }

      let matchesQuick = true;

      if (currentQuickFilter === "Belum Dikerjakan") {
        matchesQuick = task.status === "Belum Dikerjakan";
      } else if (currentQuickFilter === "Proses") {
        matchesQuick = task.status === "Proses";
      } else if (currentQuickFilter === "dueSoon") {
        matchesQuick = isDueSoon(task) || isOverdue(task);
      }

      return matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority &&
        matchesView &&
        matchesCategoryNav &&
        matchesQuick;
    });

    const priorityRank = {
      Tinggi: 3,
      Sedang: 2,
      Rendah: 1
    };

    result.sort((a, b) => {
      if (sortFilter.value === "priority") {
        return priorityRank[b.priority] - priorityRank[a.priority] ||
          a.deadline.localeCompare(b.deadline);
      }

      if (sortFilter.value === "newest") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }

      if (sortFilter.value === "oldest") {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }

      // Deadline terdekat.
      if (a.status === "Selesai" && b.status !== "Selesai") return 1;
      if (a.status !== "Selesai" && b.status === "Selesai") return -1;

      return a.deadline.localeCompare(b.deadline);
    });

    return result;
  }

  function updateEmptyState(filteredTasks) {
    const isEmpty = filteredTasks.length === 0;

    emptyState.hidden = !isEmpty;
    taskList.hidden = isEmpty;

    if (!isEmpty) return;

    const hasAnyTasks = tasks.length > 0;

    $("#emptyTitle").textContent = hasAnyTasks
      ? "Tugas tidak ditemukan"
      : "Belum ada tugas";

    $("#emptyDescription").textContent = hasAnyTasks
      ? "Coba ubah kata kunci atau filter yang kamu gunakan."
      : "Tambahkan tugas pertamamu agar aktivitas kuliah lebih teratur.";

    $("#emptyAddButton").hidden = hasAnyTasks;
  }

  // ==========================================
  // 8. DASHBOARD DAN STATISTIK
  // ==========================================

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === "Selesai"
    ).length;

    const pending = total - completed;

    const highPriority = tasks.filter(
      (task) => task.priority === "Tinggi" &&
        task.status !== "Selesai"
    ).length;

    $("#totalStat").textContent = total;
    $("#pendingStat").textContent = pending;
    $("#completedStat").textContent = completed;
    $("#highStat").textContent = highPriority;
    $("#allCount").textContent = total;

    const percentage = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

    $("#progressPercent").textContent = `${percentage}%`;
    $("#progressFill").style.width = `${percentage}%`;

    $("#progressText").textContent = total === 0
      ? "Tambahkan tugas pertamamu untuk memulai."
      : `${completed} dari ${total} tugas sudah selesai.`;

    const urgentCount = tasks.filter(
      (task) => isDueSoon(task) || isOverdue(task)
    ).length;

    $("#notificationDot").hidden = urgentCount === 0;

    $("#notificationButton").setAttribute(
      "aria-label",
      urgentCount > 0
        ? `${urgentCount} tugas memerlukan perhatian`
        : "Tidak ada pengingat deadline"
    );
  }

  function updatePageTitle() {
    const titles = {
      all: "Semua Tugas",
      today: "Deadline Hari Ini",
      upcoming: "Tugas Mendatang",
      completed: "Tugas Selesai"
    };

    const title = currentCategory !== "all"
      ? currentCategory
      : titles[currentView] || "Semua Tugas";

    $("#pageTitle").innerHTML =
      `${escapeHTML(title)}<span class="heading-period">.</span>`;

    $("#taskListDescription").textContent =
      currentCategory !== "all"
        ? `Daftar tugas kategori ${currentCategory}.`
        : currentView === "today"
          ? "Tugas dengan deadline hari ini yang belum selesai."
          : currentView === "upcoming"
            ? "Tugas dengan tenggat pada hari mendatang."
            : currentView === "completed"
              ? "Perjalanan akademikmu yang sudah diselesaikan."
              : "Kelola semua aktivitas akademikmu.";
  }

  function updateActiveNavigation() {
    document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === currentView &&
        currentCategory === "all"
      );
    });

    document.querySelectorAll(".category-nav").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.category === currentCategory
      );
    });

    document.querySelectorAll(".quick-filter").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.quick === currentQuickFilter
      );
    });
  }

  function renderTasks() {
    const filteredTasks = getFilteredTasks();

    taskList.innerHTML = filteredTasks
      .map(renderTaskCard)
      .join("");

    $("#resultCount").textContent =
      `${filteredTasks.length} tugas`;

    updateEmptyState(filteredTasks);
    updateStats();
    updatePageTitle();
    updateActiveNavigation();
  }

  // ==========================================
  // 9. FORM TAMBAH DAN EDIT TUGAS
  // ==========================================

  function openTaskDialog(task = null) {
    taskForm.reset();
    taskIdInput.value = "";

    if (task) {
      $("#dialogTitle").textContent = "Edit Tugas";
      $("#saveTaskButton").textContent = "Simpan Perubahan";

      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      courseInput.value = task.course;
      categoryInput.value = task.category;
      priorityInput.value = task.priority;
      statusInput.value = task.status;
      deadlineInput.value = task.deadline;
      descriptionInput.value = task.description || "";
    } else {
      $("#dialogTitle").textContent = "Tambah Tugas";
      $("#saveTaskButton").textContent = "Simpan Tugas";

      categoryInput.value = "Individu";
      priorityInput.value = "Sedang";
      statusInput.value = "Belum Dikerjakan";
    }

    taskDialog.showModal();

    window.setTimeout(() => {
      taskTitleInput.focus();
    }, 50);
  }

  function closeTaskDialog() {
    if (taskDialog.open) {
      taskDialog.close();
    }
  }

  function validateTaskForm() {
    const title = taskTitleInput.value.trim();
    const course = courseInput.value.trim();
    const deadline = getDeadlineDate(deadlineInput.value);

    if (!title) {
      showToast("Judul tugas wajib diisi.", "error");
      taskTitleInput.focus();
      return false;
    }

    if (!course) {
      showToast("Nama mata kuliah wajib diisi.", "error");
      courseInput.focus();
      return false;
    }

    if (!CATEGORIES.includes(categoryInput.value)) {
      showToast("Pilih kategori tugas yang valid.", "error");
      categoryInput.focus();
      return false;
    }

    if (!PRIORITIES.includes(priorityInput.value)) {
      showToast("Pilih prioritas tugas yang valid.", "error");
      priorityInput.focus();
      return false;
    }

    if (!STATUSES.includes(statusInput.value)) {
      showToast("Pilih status tugas yang valid.", "error");
      statusInput.focus();
      return false;
    }

    if (!deadline) {
      showToast("Masukkan tanggal dan waktu deadline.", "error");
      deadlineInput.focus();
      return false;
    }

    return true;
  }

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateTaskForm()) return;

    const id = taskIdInput.value;
    const existingIndex = tasks.findIndex((task) => task.id === id);

    const taskData = {
      id: id || createId(),
      title: taskTitleInput.value.trim(),
      course: courseInput.value.trim(),
      category: categoryInput.value,
      priority: priorityInput.value,
      status: statusInput.value,
      deadline: deadlineInput.value,
      description: descriptionInput.value.trim(),
      createdAt: existingIndex >= 0
        ? tasks[existingIndex].createdAt
        : Date.now(),
      updatedAt: Date.now()
    };

    const previousTasks = tasks;

    if (existingIndex >= 0) {
      tasks = tasks.map((task, index) =>
        index === existingIndex ? taskData : task
      );
    } else {
      tasks = [...tasks, taskData];
    }

    if (!saveTasks()) {
      tasks = previousTasks;
      return;
    }

    closeTaskDialog();
    renderTasks();

    showToast(
      existingIndex >= 0
        ? "Perubahan tugas berhasil disimpan."
        : "Tugas baru berhasil ditambahkan."
    );
  });

  // ==========================================
  // 10. CRUD: EDIT, HAPUS, DAN STATUS
  // ==========================================

  function editTask(id) {
    const task = getTaskById(id);

    if (!task) {
      showToast("Tugas tidak ditemukan.", "error");
      return;
    }

    openTaskDialog(task);
  }

  function deleteTask(id) {
    const task = getTaskById(id);

    if (!task) return;

    const confirmed = window.confirm(
      `Hapus tugas "${task.title}"?\n\nTindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    const previousTasks = tasks;
    tasks = tasks.filter((item) => item.id !== id);

    if (!saveTasks()) {
      tasks = previousTasks;
      return;
    }

    renderTasks();
    showToast("Tugas berhasil dihapus.");
  }

  function changeTaskStatus(id, newStatus) {
    if (!STATUSES.includes(newStatus)) {
      showToast("Status tugas tidak valid.", "error");
      renderTasks();
      return;
    }

    const task = getTaskById(id);

    if (!task || task.status === newStatus) return;

    const previousTasks = tasks;

    tasks = tasks.map((item) =>
      item.id === id
        ? { ...item, status: newStatus, updatedAt: Date.now() }
        : item
    );

    if (!saveTasks()) {
      tasks = previousTasks;
      renderTasks();
      return;
    }

    renderTasks();

    showToast(
      newStatus === "Selesai"
        ? "Mantap! Tugas berhasil diselesaikan."
        : `Status tugas diubah menjadi ${newStatus}.`
    );
  }

  // Delegasi event: tetap bekerja setelah daftar dirender ulang.
  taskList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "edit") {
      editTask(id);
    } else if (action === "delete") {
      deleteTask(id);
    }
  });

  taskList.addEventListener("change", (event) => {
    const select = event.target.closest(
      'select[data-action="status"]'
    );

    if (!select) return;

    changeTaskStatus(select.dataset.id, select.value);
  });

  // ==========================================
  // 11. FILTER NAVIGASI DAN PENCARIAN
  // ==========================================

  searchInput.addEventListener("input", renderTasks);
  categoryFilter.addEventListener("change", renderTasks);
  statusFilter.addEventListener("change", renderTasks);
  priorityFilter.addEventListener("change", renderTasks);
  sortFilter.addEventListener("change", renderTasks);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      currentCategory = "all";
      currentQuickFilter = "all";

      // Reset filter kategori agar navigasi tidak bertabrakan.
      categoryFilter.value = "all";
      statusFilter.value = "all";
      priorityFilter.value = "all";
      searchInput.value = "";

      closeSidebar();
      renderTasks();

      $("#tasksSection").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  document.querySelectorAll(".category-nav").forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;
      currentView = "all";
      currentQuickFilter = "all";

      categoryFilter.value = "all";
      statusFilter.value = "all";
      priorityFilter.value = "all";
      searchInput.value = "";

      closeSidebar();
      renderTasks();

      $("#tasksSection").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  document.querySelectorAll(".quick-filter").forEach((button) => {
    button.addEventListener("click", () => {
      currentQuickFilter = button.dataset.quick;
      renderTasks();
    });
  });

  // ==========================================
  // 12. TOMBOL TAMBAH DAN MODAL
  // ==========================================

  $("#addTaskTop").addEventListener("click", () => openTaskDialog());
  $("#fabAdd").addEventListener("click", () => openTaskDialog());
  $("#emptyAddButton").addEventListener("click", () => openTaskDialog());

  $("#closeDialog").addEventListener("click", closeTaskDialog);
  $("#cancelDialog").addEventListener("click", closeTaskDialog);

  // Tutup modal ketika pengguna menekan Escape.
  taskDialog.addEventListener("click", (event) => {
    if (event.target === taskDialog) {
      closeTaskDialog();
    }
  });

  // ==========================================
  // 13. SIDEBAR RESPONSIF
  // ==========================================

  const sidebar = $("#sidebar");
  const sidebarOverlay = $("#sidebarOverlay");
  const menuToggle = $("#menuToggle");

  function openSidebar() {
    sidebar.classList.add("is-open");
    sidebarOverlay.classList.add("is-visible");
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarOverlay.classList.remove("is-visible");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  menuToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("is-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebarOverlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      closeSidebar();
    }
  });

  // ==========================================
  // 14. TANGGAL DAN PENGINGAT
  // ==========================================

  function updateCurrentDate() {
    const today = new Date();

    $("#currentDate").textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(today);
  }

  $("#notificationButton").addEventListener("click", () => {
    const urgentTasks = tasks
      .filter((task) => isDueSoon(task) || isOverdue(task))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));

    if (urgentTasks.length === 0) {
      showToast("Tidak ada tugas yang mendekati deadline.");
      return;
    }

    const preview = urgentTasks
      .slice(0, 4)
      .map((task) => {
        const label = isOverdue(task) ? "TERLAMBAT" : "SEGERA";
        return `• ${task.title} — ${label}`;
      })
      .join("\n");

    window.alert(
      `Tugas yang perlu diperhatikan (${urgentTasks.length}):\n\n${preview}` +
      (urgentTasks.length > 4 ? "\n\n...dan tugas lainnya." : "")
    );

    currentView = "all";
    currentCategory = "all";
    currentQuickFilter = "dueSoon";

    categoryFilter.value = "all";
    statusFilter.value = "all";
    priorityFilter.value = "all";
    searchInput.value = "";

    renderTasks();

    $("#tasksSection").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  // Shortcut "/" untuk langsung mencari tugas.
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLElement &&
      (target.isContentEditable ||
       ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    if (
      event.key === "/" &&
      !isTyping &&
      !taskDialog.open &&
      window.innerWidth >= 768
    ) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  // ==========================================
  // 15. INISIALISASI APLIKASI
  // ==========================================

  updateCurrentDate();
  renderTasks();

  console.log("TaskFlow berhasil dijalankan.");
});

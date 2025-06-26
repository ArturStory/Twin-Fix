/* ------------------------------------------------------------------
  main.ts  – Twin-Fix client helpers (Bootstrap 5)
  ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", function () {
    /* ------------------------------------------------------------ */
    /*  Bootstrap helpers                                           */
    /* ------------------------------------------------------------ */
    // Tooltips
    var tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    Array.from(tooltipEls).forEach(function (el) { return new bootstrap.Tooltip(el); });
    // Popovers
    var popoverEls = document.querySelectorAll('[data-bs-toggle="popover"]');
    Array.from(popoverEls).forEach(function (el) { return new bootstrap.Popover(el); });
    // Auto–dismiss alerts (⌛ 5 s)
    window.setTimeout(function () {
        document
            .querySelectorAll(".alert:not(.alert-permanent)")
            .forEach(function (el) { return new bootstrap.Alert(el).close(); });
    }, 5000);
    /* ------------------------------------------------------------ */
    /*  Status-filter buttons                                       */
    /* ------------------------------------------------------------ */
    var filterButtons = document.querySelectorAll("[data-filter]");
    filterButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var _a;
            var filter = (_a = btn.dataset.filter) !== null && _a !== void 0 ? _a : "all";
            var table = document.getElementById("issuesTable");
            if (!table)
                return;
            table
                .querySelectorAll("tbody tr")
                .forEach(function (row) {
                row.style.display =
                    filter === "all" || row.dataset.status === filter ? "" : "none";
            });
            // visual “active” state
            filterButtons.forEach(function (b) { return b.classList.remove("active"); });
            btn.classList.add("active");
        });
    });
    /* ------------------------------------------------------------ */
    /*  Destructive-action confirm dialogs                          */
    /* ------------------------------------------------------------ */
    var confirmEls = document.querySelectorAll(".btn-delete,[data-confirm]");
    confirmEls.forEach(function (el) {
        el.addEventListener("click", function (evt) {
            var _a;
            var msg = (_a = el.dataset.confirmMessage) !== null && _a !== void 0 ? _a : "Are you sure you want to delete this item? This action cannot be undone.";
            if (!window.confirm(msg))
                evt.preventDefault();
        });
    });
    /* ------------------------------------------------------------ */
    /*  Image-file preview                                          */
    /* ------------------------------------------------------------ */
    var fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    fileInputs.forEach(function (input) {
        return input.addEventListener("change", function () {
            var _a, _b;
            var previewId = (_a = input.dataset.preview) !== null && _a !== void 0 ? _a : "imagePreview";
            var container = document.getElementById(previewId);
            if (!container)
                return;
            container.innerHTML = "";
            Array.from((_b = input.files) !== null && _b !== void 0 ? _b : [])
                .slice(0, 5) // max 5 previews
                .filter(function (file) { return file.type.startsWith("image/"); })
                .forEach(function (file) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var _a;
                    var preview = document.createElement("div");
                    preview.className = "image-preview";
                    var img = document.createElement("img");
                    img.className = "img-thumbnail";
                    img.src = String((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
                    preview.appendChild(img);
                    container.appendChild(preview);
                };
                reader.readAsDataURL(file);
            });
        });
    });
    /* ------------------------------------------------------------ */
    /*  “Urgent” shortcut for priority                              */
    /* ------------------------------------------------------------ */
    var urgentCb = document.getElementById("urgent");
    var prioritySel = document.getElementById("priority");
    if (urgentCb && prioritySel) {
        urgentCb.addEventListener("change", function () {
            if (urgentCb.checked) {
                prioritySel.value = "high";
                prioritySel.disabled = true;
            }
            else {
                prioritySel.disabled = false;
            }
        });
    }
    /* ------------------------------------------------------------ */
    /*  Current-year footer                                         */
    /* ------------------------------------------------------------ */
    var year = String(new Date().getFullYear());
    document
        .querySelectorAll(".current-year")
        .forEach(function (el) { el.textContent = year; });
});

/* ------------------------------------------------------------------
  main.ts  – Twin-Fix client helpers (Bootstrap 5)
  ------------------------------------------------------------------ */

/**
* Bootstrap ships its own UMD bundle; when you include it with a normal
* `<script src=".../bootstrap.bundle.min.js">` the global `bootstrap`
* object is created.  We add a *minimal* ambient declaration so the TS
* compiler doesn’t complain.  (If you later install `@types/bootstrap`
* you can delete this and get full typings.)
*/
declare const bootstrap: {
 Tooltip: new (el: Element) => unknown;
 Popover: new (el: Element) => unknown;
 Alert: new (el: Element) => { close(): void };
};

document.addEventListener("DOMContentLoaded", () => {
 /* ------------------------------------------------------------ */
 /*  Bootstrap helpers                                           */
 /* ------------------------------------------------------------ */

 // Tooltips
 const tooltipEls: NodeListOf<Element> =
   document.querySelectorAll('[data-bs-toggle="tooltip"]');
 Array.from(tooltipEls).forEach(el => new bootstrap.Tooltip(el));

 // Popovers
 const popoverEls: NodeListOf<Element> =
   document.querySelectorAll('[data-bs-toggle="popover"]');
 Array.from(popoverEls).forEach(el => new bootstrap.Popover(el));

 // Auto–dismiss alerts (⌛ 5 s)
 window.setTimeout(() => {
   document
     .querySelectorAll<HTMLElement>(".alert:not(.alert-permanent)")
     .forEach(el => new bootstrap.Alert(el).close());
 }, 5_000);

 /* ------------------------------------------------------------ */
 /*  Status-filter buttons                                       */
 /* ------------------------------------------------------------ */

 const filterButtons = document.querySelectorAll<HTMLElement>("[data-filter]");
 filterButtons.forEach(btn => {
   btn.addEventListener("click", () => {
     const filter = btn.dataset.filter ?? "all";
     const table = document.getElementById("issuesTable");
     if (!table) return;

     table
       .querySelectorAll<HTMLTableRowElement>("tbody tr")
       .forEach(row => {
         row.style.display =
           filter === "all" || row.dataset.status === filter ? "" : "none";
       });

     // visual “active” state
     filterButtons.forEach(b => b.classList.remove("active"));
     btn.classList.add("active");
   });
 });

 /* ------------------------------------------------------------ */
 /*  Destructive-action confirm dialogs                          */
 /* ------------------------------------------------------------ */

 const confirmEls =
   document.querySelectorAll<HTMLElement>(".btn-delete,[data-confirm]");
 confirmEls.forEach(el => {
   el.addEventListener("click", evt => {
     const msg =
       el.dataset.confirmMessage ??
       "Are you sure you want to delete this item? This action cannot be undone.";
     if (!window.confirm(msg)) evt.preventDefault();
   });
 });

 /* ------------------------------------------------------------ */
 /*  Image-file preview                                          */
 /* ------------------------------------------------------------ */

 const fileInputs =
   document.querySelectorAll<HTMLInputElement>('input[type="file"][accept*="image"]');
 fileInputs.forEach(input =>
   input.addEventListener("change", () => {
     const previewId = input.dataset.preview ?? "imagePreview";
     const container = document.getElementById(previewId);
     if (!container) return;

     container.innerHTML = "";

     Array.from(input.files ?? [])
       .slice(0, 5) // max 5 previews
       .filter(file => file.type.startsWith("image/"))
       .forEach(file => {
         const reader = new FileReader();
         reader.onload = e => {
           const preview = document.createElement("div");
           preview.className = "image-preview";

           const img = document.createElement("img");
           img.className = "img-thumbnail";
           img.src = String(e.target?.result);

           preview.appendChild(img);
           container.appendChild(preview);
         };
         reader.readAsDataURL(file);
       });
   })
 );

 /* ------------------------------------------------------------ */
 /*  “Urgent” shortcut for priority                              */
 /* ------------------------------------------------------------ */

 const urgentCb = document.getElementById("urgent") as HTMLInputElement | null;
 const prioritySel = document.getElementById("priority") as HTMLSelectElement | null;
 if (urgentCb && prioritySel) {
   urgentCb.addEventListener("change", () => {
     if (urgentCb.checked) {
       prioritySel.value = "high";
       prioritySel.disabled = true;
     } else {
       prioritySel.disabled = false;
     }
   });
 }

 /* ------------------------------------------------------------ */
 /*  Current-year footer                                         */
 /* ------------------------------------------------------------ */

 const year = String(new Date().getFullYear());
 document
   .querySelectorAll<HTMLElement>(".current-year")
   .forEach(el => { el.textContent = year; });
});
export default function showCanvas(
  title,
  {
    side = "start",          // start, end, top, bottom
    staticBackdrop = true,   // static backdrop like modal
    width = null,            // only for start/end
    height = null            // only for top/bottom
  } = {}
) {
  const positionClass = `offcanvas-${side}`;

  // Construct HTML
  const html = `
    <div class="offcanvas ${positionClass}" tabindex="-1">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">${title}</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas"></button>
      </div>
      <div class="offcanvas-body"></div>
    </div>
  `;

  const $canvas = $(html);
  $("body").append($canvas);

  // Apply dynamic width/height
  if (["start", "end"].includes(side) && width) {
    $canvas[0].style.setProperty("--bs-offcanvas-width", width);
  }
  if (["top", "bottom"].includes(side) && height) {
    $canvas[0].style.setProperty("--bs-offcanvas-height", height);
  }

  // Bootstrap instance
  const bsCanvas = new bootstrap.Offcanvas($canvas[0], {
    backdrop: staticBackdrop ? "static" : true,
    keyboard: !staticBackdrop
  });

  // Clean up on hide
  $canvas.on("hidden.bs.offcanvas", () => $canvas.remove());

  // Store instance
  $canvas.data("bs.offcanvas", bsCanvas);

  return $canvas;
}

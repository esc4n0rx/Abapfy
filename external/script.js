const abapCode = `REPORT zrelatorio_vendas.

TABLES: vbak, vbap.

PARAMETERS:
  p_vkorg TYPE vbak-vkorg OBLIGATORY,
  p_datai TYPE vbak-erdat OBLIGATORY,
  p_dataf TYPE vbak-erdat OBLIGATORY.

SELECT a~vbeln, a~erdat, a~kunnr,
       b~matnr, b~kwmeng, b~netwr
  INTO TABLE @DATA(gt_vendas)
  FROM vbak AS a
  INNER JOIN vbap AS b ON b~vbeln = a~vbeln
  WHERE a~vkorg = @p_vkorg
    AND a~erdat BETWEEN @p_datai AND @p_dataf.

IF sy-subrc <> 0.
  MESSAGE 'Nenhum dado encontrado.' TYPE 'I'.
  RETURN.
ENDIF.

CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  TABLES t_outtab = gt_vendas.
`;

const codeTarget = document.getElementById("abap-typing");
let pointer = 0;

function typeLoop() {
  if (!codeTarget) return;

  if (pointer <= abapCode.length) {
    codeTarget.textContent = abapCode.slice(0, pointer) + "|";
    pointer += 1;
    setTimeout(typeLoop, 18);
    return;
  }

  setTimeout(() => {
    pointer = 0;
    typeLoop();
  }, 1700);
}

typeLoop();

const revealItems = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 40, 360)}ms`;
  observer.observe(item);
});

const counters = document.querySelectorAll("[data-counter]");
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const el = entry.target;
    const target = Number(el.dataset.counter || 0);
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(progress * target);
      el.textContent = String(value);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = String(target);
      }
    }

    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.45 });

counters.forEach((counter) => countObserver.observe(counter));

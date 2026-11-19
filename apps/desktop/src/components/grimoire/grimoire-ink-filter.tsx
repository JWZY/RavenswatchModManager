/** Live artwork becomes sepia linework; the original images remain untouched. */
export function GrimoireInkFilter() {
  return (
    <svg className="grimoire-filter-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="grimoire-engraving"
          colorInterpolationFilters="sRGB"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <feColorMatrix type="saturate" values="0" result="gray" />
          <feGaussianBlur in="gray" stdDeviation="0.35" result="softened" />
          <feConvolveMatrix
            in="softened"
            order="3"
            kernelMatrix="0 -1 0 -1 4 -1 0 -1 0"
            divisor="0.22"
            bias="1"
            preserveAlpha="true"
            result="edges"
          />
          <feColorMatrix
            in="edges"
            values="0 0 0 0 .32  0 0 0 0 .20  0 0 0 0 .18  -.95 0 0 0 .95"
            result="lines"
          />
          <feColorMatrix
            in="gray"
            values="0 0 0 0 .39  0 0 0 0 .25  0 0 0 0 .23  -.08 0 0 0 .08"
            result="wash"
          />
          <feBlend in="lines" in2="wash" mode="normal" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

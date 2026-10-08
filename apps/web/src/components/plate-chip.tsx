/** Registration number styled like the plate it names: framed, with the accent as the EU band. */
export function PlateChip({ plate }: { plate: string }) {
  return (
    <span className="inline-flex max-w-full items-stretch overflow-hidden rounded-[4px] border-[1.5px] border-ink bg-white">
      <span aria-hidden className="w-2 shrink-0 bg-accent" />
      <span className="truncate px-2 py-0.5 text-sm font-semibold tracking-wider">{plate}</span>
    </span>
  );
}

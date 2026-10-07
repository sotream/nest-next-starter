/** Registration number styled like the plate it names: framed, with the accent as the EU band. */
export function PlateChip({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-[4px] border-2 border-ink bg-white">
      <span aria-hidden className="w-2.5 bg-accent" />
      <span className="px-2.5 py-0.5 text-lg font-bold tracking-wider">{plate}</span>
    </span>
  );
}

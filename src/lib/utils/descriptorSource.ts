/**
 * Display metadata for a tool's source descriptor format - the upstream spec the
 * wrapper was generated from. The raw value is the manifest app's `format`
 * (= the niwrap `source.type`), and the source file is always `<format>.json`,
 * so {@link descriptorSourceInfo} both labels it and powers the GitHub link.
 */
export interface DescriptorSourceInfo {
	/** The raw format key (e.g. `boutiques`). */
	format: string;
	/** Human-facing label, e.g. "Boutiques". */
	label: string;
	/** One-line provenance blurb, used in the link tooltip. */
	blurb: string;
}

const SOURCES: Record<string, Omit<DescriptorSourceInfo, 'format'>> = {
	boutiques: { label: 'Boutiques', blurb: 'a portable Boutiques descriptor' },
	workbench: { label: 'Workbench', blurb: 'a Connectome Workbench wb_command spec' },
	mrtrix: { label: 'MRtrix', blurb: 'a native MRtrix command spec' },
	argdump: { label: 'Argdump', blurb: 'a captured argument dump' }
};

/**
 * Resolve display info for a descriptor `format`. Returns `null` for a missing
 * format (unwrapped apps); unknown formats fall back to a titlecased label so a
 * new frontend still renders sensibly before this map is updated.
 */
export function descriptorSourceInfo(
	format: string | null | undefined
): DescriptorSourceInfo | null {
	if (!format) return null;
	const known = SOURCES[format];
	if (known) return { format, ...known };
	const label = format.charAt(0).toUpperCase() + format.slice(1);
	return { format, label, blurb: `a ${label} descriptor` };
}

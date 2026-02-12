/**
 * Sample weekly digest content in Slack markdown format.
 * Used for digest preview (sample mode) and seed script.
 */
export function getSampleDigestSlack(): string {
  const weekLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `*Weekly Competitive Intelligence Brief*
_Week of ${weekLabel}_

*Placemakr*
• Announced $50M Series C funding led by Redpoint Ventures — plans to enter 10 new markets
• New "Corporate Solutions" section added to website — signals B2B pivot
• Hiring VP of Technology and Regional Director for Southeast
• *Why it matters:* Placemakr is the most direct competitor in flexible-stay. This funding level enables aggressive expansion into markets where Kasa operates. The corporate housing pivot opens a new competitive front.
• *Recommended action:* Pre-empt in Southeast markets (Atlanta, Nashville). Monitor corporate housing product development. Accelerate Kasa's own technology differentiation.

*AvantStay*
• Hiring Head of AI & Machine Learning — significant tech investment signal
• Expanded into Miami with 15 luxury properties targeting group travel
• *Why it matters:* AvantStay's AI investment could lead to automated pricing and operational efficiencies. Miami expansion shows continued focus on premium/luxury segment.
• *Recommended action:* Monitor AI capabilities development. AvantStay focuses on luxury group travel (different segment than Kasa), but their tech innovations could spread to broader market.

*Lark*
• Complete website rebrand from "Stay Alfred" to "Lark" — strategic reset
• Launched in Nashville with 8 downtown properties
• Hiring Director of Partnerships for B2B growth
• *Why it matters:* Lark's rebrand signals renewed strategic ambition. Nashville launch increases competitive density in a target market. Partnership hiring suggests inventory growth acceleration.
• *Recommended action:* Watch Lark's Nashville performance closely. Their downtown-only model overlaps with Kasa's urban focus. Consider partnership opportunities or competitive differentiation.

*Bottom Line:* The competitive landscape is intensifying with Placemakr's Series C leading the charge. All three competitors are expanding geographically and investing in technology. Kasa should prioritize speed-to-market in contested cities and accelerate B2B corporate housing capabilities.`;
}

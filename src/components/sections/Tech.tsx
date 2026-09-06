import { useMemo } from "react";

import { TechBallsRow } from "../canvas";
import { SectionWrapper } from "../../hoc";
import { useContent } from "../../hooks/useContent";
import { Header } from "../atoms/Header";
import { config } from "../../constants/config";
import type { TTechnology } from "../../types";

const UNCATEGORIZED_LABEL = "Other";

// Groups are derived from whatever category strings actually appear on the
// skills (set freely per-skill from the CMS) -- not a fixed list. Order
// follows each category's first appearance, matching skills' sort_order.
function groupByCategory(items: TTechnology[]) {
  const order: string[] = [];
  const groups = new Map<string, TTechnology[]>();

  for (const item of items) {
    const key = item.category?.trim() || UNCATEGORIZED_LABEL;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  return order.map((category) => ({ category, items: groups.get(category)! }));
}

const Tech = () => {
  const { technologies } = useContent();
  const groups = useMemo(() => groupByCategory(technologies), [technologies]);

  return (
    <>
      <Header useMotion={true} {...config.sections.skills} />

      <div className="mt-16 flex flex-col gap-12">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 text-[18px] font-bold text-white">
              {group.category}
            </h3>
            <TechBallsRow technologies={group.items} />
          </div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Tech, "tech");

import { motion } from "framer-motion";

import { styles } from "../constants/styles";

interface Props {
  Component: React.ElementType;
  idName: string;
}

const FALLBACK_ID = "section";

const SectionWrapper = (
  Component: Props["Component"],
  idName: Props["idName"]
) =>
  function HOC() {
    return (
      <motion.section
        initial="hidden"
        whileInView="show"
        // "some" (any pixel visible) rather than a fraction of the whole
        // section -- amount:0.25 required 25% of the *entire* section in
        // view before the reveal ever triggered, and with once:true the
        // observer never gets a second chance. Fine for a short section,
        // but content sections grow (more projects/skills/experience from
        // the CMS), and on mobile everything stacks single-column, easily
        // making a section 4000px+ tall -- scrolling to it via the nav
        // link lands you one viewport-height in, nowhere near 25% of that,
        // so the whole section (and everything in it) stayed permanently
        // at its hidden state. Any visible pixel is enough to reveal.
        viewport={{ once: true, amount: "some" }}
        className={`${styles.padding} relative z-0 mx-auto max-w-7xl`}
        id={idName || FALLBACK_ID}
      >
        <Component />
      </motion.section>
    );
  };

export default SectionWrapper;

import HelpIcon from "./HelpIcon";
import type { TemplateSpec } from "./SongForm";
import React from "react";
import styles from "./SongForm.module.css";
import clsx from "clsx";

interface Props {
  templates: Record<string, TemplateSpec>;
  selectedTemplate: string;
  setSelectedTemplate: (name: string) => void;
  applyTemplate: (tpl: TemplateSpec) => void;
}

export default function TemplateSelector({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  applyTemplate,
}: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.label}>
        Song Templates
        <HelpIcon text="Select a preset arrangement and settings" />
      </div>
      <select
        aria-label="Song Templates"
        value={selectedTemplate}
        onChange={(e) => {
          const templateName = e.target.value;
          setSelectedTemplate(templateName);
          if (templateName && templates[templateName]) {
            applyTemplate(templates[templateName]);
          }
        }}
        className={clsx(styles.input, "py-2 px-3")}
      >
        <option value="">Custom Structure</option>
        {Object.keys(templates).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

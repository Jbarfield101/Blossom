import HelpIcon from "./HelpIcon";
import type { TemplateSpec } from "./SongForm";
import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
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
  const templateOptions = React.useMemo(
    () => [
      { label: "Custom Structure", value: "" },
      ...Object.keys(templates).map((name) => ({ label: name, value: name })),
    ],
    [templates]
  );

  const selectedOption = templateOptions.find(
    (o) => o.value === selectedTemplate
  ) ?? null;

  const tpl = selectedTemplate ? templates[selectedTemplate] : null;

  return (
    <div className={styles.panel}>
      <div className={styles.label}>
        Song Templates
        <HelpIcon text="Select a preset arrangement and settings" />
      </div>
      <Autocomplete
        options={templateOptions}
        value={selectedOption}
        onChange={(_e, newValue) => {
          const templateName = newValue?.value ?? "";
          setSelectedTemplate(templateName);
          if (templateName && templates[templateName]) {
            applyTemplate(templates[templateName]);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            inputProps={{
              ...params.inputProps,
              "aria-label": "Song Templates",
              className: clsx(styles.input, "py-2 px-3"),
            }}
            placeholder="Select template"
          />
        )}
      />
      {tpl && (
        <div className={clsx(styles.small, "mt-2")}
        >
          <div>
            <strong>Structure:</strong>{" "}
            {tpl.structure.map((s) => `${s.name} (${s.bars})`).join(", ")}
          </div>
          <div>
            <strong>BPM:</strong> {tpl.bpm}
          </div>
          <div>
            <strong>Mood:</strong> {tpl.mood.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

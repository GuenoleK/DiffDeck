import { useId, useState } from "react";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./EditableFindingComment.scss";

type EditableFindingCommentProps = {
  isDirty: boolean;
  value: string;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
};

export function EditableFindingComment({ isDirty, value, onChange, onSave }: EditableFindingCommentProps) {
  const [isSaving, setIsSaving] = useState(false);
  const fieldId = useId();

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="editable-finding-comment">
      <div className="editable-finding-comment__header">
        <label className="editable-finding-comment__label" htmlFor={fieldId}>
          Final comment
        </label>
        {isDirty ? <span className="editable-finding-comment__state">Unsaved</span> : null}
      </div>
      <textarea
        className="editable-finding-comment__textarea"
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        value={value}
      />
      <div className="editable-finding-comment__actions">
        <Button disabled={!isDirty || isSaving} onClick={() => void save()}>
          {isSaving ? "Saving" : "Save comment"}
        </Button>
      </div>
    </section>
  );
}

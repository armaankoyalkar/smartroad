import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, Fieldset, FormError } from "./Field";
import { Input, Textarea } from "./Input";
import { Select } from "./Select";

describe("Field", () => {
  it("associates the label, hint and error with the control", () => {
    render(
      <Field label="Email" hint="We never share it" error="Enter a valid email address">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Enter a valid email address");
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedBy).toContain(alert.id);
    expect(describedBy).toContain(screen.getByText("We never share it").id);
  });

  it("has no aria-invalid and no alert without an error", () => {
    render(
      <Field label="Title">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Title");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("works with Textarea and Select and respects an explicit id", () => {
    render(
      <>
        <Field label="Description" id="desc">
          <Textarea />
        </Field>
        <Field label="Category">
          <Select
            placeholder="Choose"
            options={[
              { value: "POTHOLE", label: "Pothole" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Description")).toHaveAttribute("id", "desc");
    const select = screen.getByLabelText("Category");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Pothole" })).toBeInTheDocument();
  });

  it("shows the optional marker and the required star", () => {
    render(
      <>
        <Field label="Phone" showOptional>
          <Input />
        </Field>
        <Field label="Name" required>
          <Input />
        </Field>
      </>,
    );
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });
});

describe("Fieldset and FormError", () => {
  it("announces a group error and a form-level error", () => {
    render(
      <>
        <Fieldset legend="Severity" error="Choose a severity">
          <input type="radio" aria-label="Low" />
        </Fieldset>
        <FormError message="Something went wrong on the server" />
      </>,
    );
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Severity" })).toHaveAttribute("aria-invalid", "true");
  });

  it("renders nothing for an empty form error", () => {
    const { container } = render(<FormError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

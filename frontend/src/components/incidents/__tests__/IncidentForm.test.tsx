import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { renderWithProviders } from "@/test/utils";
import { IncidentForm } from "../IncidentForm";

interface PickerStubProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (position: { latitude: number; longitude: number } | null, source: string) => void;
  onAddressSuggestion?: (address: string | null) => void;
  error?: ReactNode;
}

// Leaflet is not rendered in jsdom: the picker is replaced by buttons that drive its callbacks.
vi.mock("@/components/map/LazyMap", () => ({
  LazyLocationPicker: (props: PickerStubProps) => (
    <div>
      <button type="button" onClick={() => props.onChange({ latitude: 17.4483, longitude: 78.3814 }, "map")}>
        Set location
      </button>
      <button type="button" onClick={() => props.onChange({ latitude: 95, longitude: 78.3814 }, "input")}>
        Set invalid location
      </button>
      <button type="button" onClick={() => props.onAddressSuggestion?.("Hitec City Main Road, Madhapur")}>
        Suggest address
      </button>
      <p>
        coords {String(props.latitude)},{String(props.longitude)}
      </p>
      {props.error && <p data-testid="location-error">{props.error}</p>}
    </div>
  ),
  LazyMiniMap: () => <div data-testid="mini-map" />,
}));

const VALID = {
  title: "Deep pothole near the flyover",
  description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
};

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/^Category/), "POTHOLE");
  await user.type(screen.getByLabelText(/^Title/), VALID.title);
  await user.type(screen.getByLabelText(/^Description/), VALID.description);
  await user.click(screen.getByRole("radio", { name: /^High/ }));
}

describe("IncidentForm", () => {
  it("requires every field and a location before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<IncidentForm onSubmit={onSubmit} />);
    expect(screen.getByText("Location required")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByText("Choose a category")).toBeInTheDocument();
    expect(screen.getByText("Title must be 5 to 120 characters")).toBeInTheDocument();
    expect(screen.getByText("Description must be 10 to 2000 characters")).toBeInTheDocument();
    expect(screen.getByText("Choose a severity")).toBeInTheDocument();
    expect(screen.getByTestId("location-error")).toHaveTextContent(
      "Pick a location on the map or enter coordinates",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("enforces the title and description lengths", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<IncidentForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/^Title/), "abc");
    await user.type(screen.getByLabelText(/^Description/), "too short");
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByText("Title must be 5 to 120 characters")).toBeInTheDocument();
    expect(screen.getByText("Description must be 10 to 2000 characters")).toBeInTheDocument();
    expect(screen.getByText(`${"too short".length}/2000`)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects coordinates outside the valid range", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<IncidentForm onSubmit={onSubmit} />);
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "Set invalid location" }));
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByTestId("location-error")).toHaveTextContent(
      "Latitude must be between -90 and 90",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects files that are not JPEG, PNG or WebP images", async () => {
    // user-event honours the input's `accept` list by default; the component must reject the file itself.
    const user = userEvent.setup({ applyAccept: false });
    renderWithProviders(<IncidentForm onSubmit={vi.fn()} />);
    const input = screen.getByLabelText(/^Photo/);
    await user.upload(input, new File(["hello"], "notes.txt", { type: "text/plain" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Image must be JPEG, PNG or WebP");
    expect(screen.queryByAltText("Selected photo preview")).not.toBeInTheDocument();
  });

  it("builds the payload from the fields, the picked location, the suggested address and the photo", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<IncidentForm onSubmit={onSubmit} />);
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "Set location" }));
    await user.click(screen.getByRole("button", { name: "Suggest address" }));
    expect(screen.getByText("coords 17.4483,78.3814")).toBeInTheDocument();
    expect(screen.queryByText("Location required")).not.toBeInTheDocument();
    const photo = new File(["png-bytes"], "pothole.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/^Photo/), photo);
    expect(await screen.findByAltText("Selected photo preview")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit report" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      title: VALID.title,
      category: "POTHOLE",
      description: VALID.description,
      severity: "HIGH",
      latitude: 17.4483,
      longitude: 78.3814,
      address: "Hitec City Main Road, Madhapur",
      image: photo,
    });
  });

  it("maps server field errors back onto the form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "Request validation failed.", {
        status: 400,
        details: [{ field: "title", message: "Title is too generic" }],
      }),
    );
    renderWithProviders(<IncidentForm onSubmit={onSubmit} />);
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "Set location" }));
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByText("Title is too generic")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toHaveAttribute("aria-invalid", "true");
  });
});

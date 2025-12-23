import { describe, it, expect } from "vitest";
import { successToast, errorToast, warningToast, infoToast } from "./toast-styles";

describe("toast-styles", () => {
  describe("successToast", () => {
    it("creates notification data with title", () => {
      const toast = successToast("Success!");
      expect(toast.title).toBe("Success!");
      expect(toast.message).toBeUndefined();
    });

    it("creates notification data with title and message", () => {
      const toast = successToast("Success!", "Operation completed");
      expect(toast.title).toBe("Success!");
      expect(toast.message).toBe("Operation completed");
    });

    it("has correct autoClose time", () => {
      const toast = successToast("Test");
      expect(toast.autoClose).toBe(4000);
    });

    it("has close button enabled", () => {
      const toast = successToast("Test");
      expect(toast.withCloseButton).toBe(true);
    });

    it("has icon", () => {
      const toast = successToast("Test");
      expect(toast.icon).toBeDefined();
    });

    it("has styles defined", () => {
      const toast = successToast("Test");
      expect(toast.styles).toBeDefined();
      // styles can be an object or function, just verify it exists
      expect(typeof toast.styles === 'object' || typeof toast.styles === 'function').toBe(true);
    });
  });

  describe("errorToast", () => {
    it("creates notification data with title", () => {
      const toast = errorToast("Error!");
      expect(toast.title).toBe("Error!");
      expect(toast.message).toBeUndefined();
    });

    it("creates notification data with title and message", () => {
      const toast = errorToast("Error!", "Something went wrong");
      expect(toast.title).toBe("Error!");
      expect(toast.message).toBe("Something went wrong");
    });

    it("has longer autoClose time for errors", () => {
      const toast = errorToast("Test");
      expect(toast.autoClose).toBe(6000);
    });

    it("has close button enabled", () => {
      const toast = errorToast("Test");
      expect(toast.withCloseButton).toBe(true);
    });

    it("has icon", () => {
      const toast = errorToast("Test");
      expect(toast.icon).toBeDefined();
    });
  });

  describe("warningToast", () => {
    it("creates notification data with title", () => {
      const toast = warningToast("Warning!");
      expect(toast.title).toBe("Warning!");
      expect(toast.message).toBeUndefined();
    });

    it("creates notification data with title and message", () => {
      const toast = warningToast("Warning!", "Be careful");
      expect(toast.title).toBe("Warning!");
      expect(toast.message).toBe("Be careful");
    });

    it("has medium autoClose time", () => {
      const toast = warningToast("Test");
      expect(toast.autoClose).toBe(5000);
    });

    it("has close button enabled", () => {
      const toast = warningToast("Test");
      expect(toast.withCloseButton).toBe(true);
    });

    it("has icon", () => {
      const toast = warningToast("Test");
      expect(toast.icon).toBeDefined();
    });
  });

  describe("infoToast", () => {
    it("creates notification data with title", () => {
      const toast = infoToast("Info");
      expect(toast.title).toBe("Info");
      expect(toast.message).toBeUndefined();
    });

    it("creates notification data with title and message", () => {
      const toast = infoToast("Info", "Here is some info");
      expect(toast.title).toBe("Info");
      expect(toast.message).toBe("Here is some info");
    });

    it("has correct autoClose time", () => {
      const toast = infoToast("Test");
      expect(toast.autoClose).toBe(4000);
    });

    it("has close button enabled", () => {
      const toast = infoToast("Test");
      expect(toast.withCloseButton).toBe(true);
    });

    it("has icon", () => {
      const toast = infoToast("Test");
      expect(toast.icon).toBeDefined();
    });
  });
});

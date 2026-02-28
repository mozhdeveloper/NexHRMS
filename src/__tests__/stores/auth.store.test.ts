/**
 * Unit tests for the Auth store
 */
import { useAuthStore } from "@/store/auth.store";
import { DEMO_USERS } from "@/data/seed";

const resetAuth = () => {
    useAuthStore.setState({
        currentUser: DEMO_USERS[0],
        isAuthenticated: false,
        theme: "light",
    });
};

beforeEach(resetAuth);

describe("Auth Store — login", () => {
    it("returns true and sets isAuthenticated for valid credentials", () => {
        const { login } = useAuthStore.getState();
        const ok = login("admin@nexhrms.com", "demo1234");
        expect(ok).toBe(true);

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.currentUser.role).toBe("admin");
    });

    it("returns false if password is wrong", () => {
        const { login } = useAuthStore.getState();
        const ok = login("admin@nexhrms.com", "wrongpassword");
        expect(ok).toBe(false);
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("returns false if email is not found", () => {
        const { login } = useAuthStore.getState();
        const ok = login("nobody@nexhrms.com", "demo1234");
        expect(ok).toBe(false);
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("sets the correct user based on email", () => {
        const { login } = useAuthStore.getState();
        login("hr@nexhrms.com", "demo1234");
        expect(useAuthStore.getState().currentUser.role).toBe("hr");
        expect(useAuthStore.getState().currentUser.email).toBe("hr@nexhrms.com");
    });

    it("sets finance user correctly", () => {
        const { login } = useAuthStore.getState();
        login("finance@nexhrms.com", "demo1234");
        expect(useAuthStore.getState().currentUser.role).toBe("finance");
    });

    it("sets employee user correctly", () => {
        const { login } = useAuthStore.getState();
        login("employee@nexhrms.com", "demo1234");
        expect(useAuthStore.getState().currentUser.role).toBe("employee");
    });
});

describe("Auth Store — logout", () => {
    it("sets isAuthenticated to false", () => {
        useAuthStore.setState({ isAuthenticated: true });
        const { logout } = useAuthStore.getState();
        logout();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("resets currentUser to the first demo user (admin)", () => {
        useAuthStore.setState({ isAuthenticated: true, currentUser: DEMO_USERS[3] });
        const { logout } = useAuthStore.getState();
        logout();
        expect(useAuthStore.getState().currentUser).toMatchObject(DEMO_USERS[0]);
    });
});

describe("Auth Store — switchRole", () => {
    it("switches to the correct demo user for a given role", () => {
        const { switchRole } = useAuthStore.getState();
        switchRole("hr");
        expect(useAuthStore.getState().currentUser.role).toBe("hr");
    });

    it("falls back to DEMO_USERS[0] for an unknown role", () => {
        const { switchRole } = useAuthStore.getState();
        // @ts-expect-error testing invalid input
        switchRole("superadmin");
        expect(useAuthStore.getState().currentUser).toMatchObject(DEMO_USERS[0]);
    });
});

describe("Auth Store — setTheme", () => {
    it("updates the theme", () => {
        const { setTheme } = useAuthStore.getState();
        setTheme("dark");
        expect(useAuthStore.getState().theme).toBe("dark");
        setTheme("system");
        expect(useAuthStore.getState().theme).toBe("system");
    });
});

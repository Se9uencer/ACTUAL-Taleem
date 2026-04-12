import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "../route"

// ---------------------------------------------------------------------------
// Hoisted mock handles
// vi.mock factories are hoisted before imports, so variables they reference
// must be created with vi.hoisted.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  transcriptionsCreate: vi.fn(),
  authGetUser: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

// Mock OpenAI — the route creates `const openai = new OpenAI({...})` at module
// load time; our mock intercepts that constructor call.
// Must use a regular function (not an arrow) so `new OpenAI()` succeeds.
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      audio: {
        transcriptions: { create: mocks.transcriptionsCreate },
      },
    }
  }),
}))

// Mock service role client used for all DB operations inside the route.
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

// Mock the anon Supabase client used only for auth.getUser token verification.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: { getUser: mocks.authGetUser },
  })),
}))

// Provide valid-looking config so the route doesn't short-circuit with 500.
vi.mock("@/lib/config", () => ({
  supabaseConfig: {
    url: "https://fake-project.supabase.co",
    anonKey: "fake-anon-key",
  },
  arabicConfig: { USE_HARAKAT_MATCHING: false },
}))

// Mock quran.json to avoid parsing 1.7MB at test time and to have a single,
// known verse we can match transcription output against.
vi.mock("@/quran.json", () => ({
  default: {
    // Surah 1, ayah 1 — Basmala
    "1": [{ verse: 1, text: "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650" }],
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a chainable Supabase mock client.
 *
 * The route makes these calls:
 *   1. from("assignments").select(...).eq(...).single()   → assignment row
 *   2. from("recitations").insert(...).select().single()  → saved recitation
 *   3. from("feedback").insert(...)                       → awaited directly
 *   4. from("recitations").update(...).eq(...).eq(...).neq(...) → awaited directly
 *
 * For cases 3 & 4 the route either doesn't capture the result or only checks
 * `error`, so awaiting a plain (non-thenable) chain object is fine — `await`
 * resolves it immediately and the destructured `error` field is `undefined`.
 */
function makeMockServiceClient({
  assignment = {
    surah_name: "1. Al-Fatihah (The Opening)",
    start_ayah: 1,
    end_ayah: 1,
  } as Record<string, unknown> | null,
  assignmentError = null as unknown,
  recitation = { id: "rec-test-id" } as Record<string, unknown> | null,
  recitationError = null as unknown,
} = {}) {
  /** A chain where every method returns the chain itself. */
  function makeChain() {
    const c: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    for (const key of ["select", "insert", "update", "eq", "neq"]) {
      c[key].mockReturnValue(c)
    }
    return c
  }

  // Chain for from("assignments") — .select().eq().single() must resolve.
  const assignmentsChain = makeChain()
  assignmentsChain.single = vi.fn().mockResolvedValue({
    data: assignment,
    error: assignmentError,
  })

  // Chain for from("recitations") first call — .insert().select().single().
  const recInsertChain = makeChain()
  recInsertChain.single = vi.fn().mockResolvedValue({
    data: recitation,
    error: recitationError,
  })

  // Track how many times from("recitations") has been called so we can return
  // the right chain (insert on call 1, update on call 2).
  let recitationCalls = 0

  return {
    from: vi.fn((table: string) => {
      if (table === "assignments") return assignmentsChain
      if (table === "recitations") return ++recitationCalls === 1 ? recInsertChain : makeChain()
      return makeChain() // feedback and anything else
    }),
  }
}

/** Build a POST Request with an Authorization header and the given FormData. */
function makeAuthorizedRequest(formData: FormData, token = "valid-bearer-token") {
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
}

/** A valid 1-byte audio File that passes all validation checks. */
function makeAudioFile(name = "recitation.mp3", type = "audio/mpeg") {
  return new File([new Uint8Array(1)], name, { type })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: auth succeeds, Whisper returns a plausible Arabic transcription,
    // and the DB client is ready. Individual tests override as needed.
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-test-id" } },
      error: null,
    })
    mocks.transcriptionsCreate.mockResolvedValue(
      // Plain Arabic without diacritics — typical Whisper output
      "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645"
    )
    mocks.createServiceRoleClient.mockReturnValue(makeMockServiceClient())
  })

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------
  describe("authentication", () => {
    it("returns 401 when no Authorization header or cookie is present", async () => {
      const formData = new FormData()
      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toMatchObject({ error: expect.stringContaining("Unauthorized") })
    })

    it("returns 401 when the bearer token is rejected by Supabase auth", async () => {
      mocks.authGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "JWT expired" },
      })

      const formData = new FormData()
      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(401)
      expect(await response.json()).toMatchObject({ error: expect.stringContaining("Unauthorized") })
    })
  })

  // -------------------------------------------------------------------------
  // File validation (auth is mocked to succeed for all of these)
  // -------------------------------------------------------------------------
  describe("file validation", () => {
    it("returns 400 when no file field is included in the form data", async () => {
      const formData = new FormData()
      formData.append("assignmentId", "assignment-abc")
      // No "file" field

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: "No file uploaded" })
    })

    it("returns 400 when the file exceeds the 10 MB size limit", async () => {
      const oversizedContent = new Uint8Array(11 * 1024 * 1024) // 11 MB
      const bigFile = new File([oversizedContent], "big-recording.mp3", { type: "audio/mpeg" })

      const formData = new FormData()
      formData.append("file", bigFile)
      formData.append("assignmentId", "assignment-abc")

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toMatch(/File too large/i)
    })

    it("returns 400 when the file MIME type is not an allowed audio format", async () => {
      const videoFile = new File([new Uint8Array(100)], "clip.mp4", { type: "video/mp4" })

      const formData = new FormData()
      formData.append("file", videoFile)
      formData.append("assignmentId", "assignment-abc")

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toMatch(/Unsupported file type/i)
    })

    it("returns 400 when assignmentId is missing from the form data", async () => {
      const formData = new FormData()
      formData.append("file", makeAudioFile())
      // No "assignmentId"

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: "Missing assignment ID" })
    })
  })

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  describe("happy path", () => {
    it("returns 200 with recitationId, accuracy, feedback, and verseFeedback", async () => {
      const formData = new FormData()
      formData.append("file", makeAudioFile())
      formData.append("assignmentId", "assignment-xyz")

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.recitationId).toBe("rec-test-id")
      expect(typeof body.accuracy).toBe("number")
      expect(body.accuracy).toBeGreaterThanOrEqual(0)
      expect(body.accuracy).toBeLessThanOrEqual(100)
      expect(typeof body.feedback).toBe("string")
      expect(body.feedback.length).toBeGreaterThan(0)
      expect(Array.isArray(body.verseFeedback)).toBe(true)
      expect(body.statistics).toMatchObject({
        totalVerses: expect.any(Number),
        excellentVerses: expect.any(Number),
        goodVerses: expect.any(Number),
        averageAccuracy: expect.any(Number),
      })
    })

    it("calls Whisper with the uploaded file, whisper-1 model, and Arabic language", async () => {
      const audioFile = makeAudioFile("test.mp3", "audio/mpeg")
      const formData = new FormData()
      formData.append("file", audioFile)
      formData.append("assignmentId", "assignment-xyz")

      await POST(makeAuthorizedRequest(formData))

      expect(mocks.transcriptionsCreate).toHaveBeenCalledOnce()
      expect(mocks.transcriptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "whisper-1",
          language: "ar",
          response_format: "text",
        })
      )
    })

    it("calls the service role client to persist the recitation and feedback", async () => {
      const formData = new FormData()
      formData.append("file", makeAudioFile())
      formData.append("assignmentId", "assignment-xyz")

      await POST(makeAuthorizedRequest(formData))

      expect(mocks.createServiceRoleClient).toHaveBeenCalled()
    })

    it("accepts a token supplied via the sb-access-token cookie as well as the header", async () => {
      const formData = new FormData()
      formData.append("file", makeAudioFile())
      formData.append("assignmentId", "assignment-xyz")

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        headers: { Cookie: "sb-access-token=cookie-token-value" },
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mocks.authGetUser).toHaveBeenCalledWith("cookie-token-value")
    })
  })

  // -------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------
  describe("rate limiting", () => {
    it("returns 429 with Retry-After header after 10 requests from the same user within an hour", async () => {
      // Use a dedicated user ID so other tests' requests don't pollute this bucket.
      // Each request needs a fresh service client instance so the recitationCalls
      // counter inside makeMockServiceClient doesn't carry over between requests.
      mocks.authGetUser.mockResolvedValue({
        data: { user: { id: "rate-limit-test-user" } },
        error: null,
      })
      mocks.createServiceRoleClient.mockImplementation(() => makeMockServiceClient())

      const makeRequest = () => {
        const formData = new FormData()
        formData.append("file", makeAudioFile())
        formData.append("assignmentId", "assignment-xyz")
        return POST(makeAuthorizedRequest(formData, "rate-limit-token"))
      }

      // Exhaust the 10-request allowance
      for (let i = 0; i < 10; i++) {
        const res = await makeRequest()
        expect(res.status).toBe(200)
      }

      // 11th request must be rejected
      const response = await makeRequest()
      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toMatch(/Rate limit exceeded/i)
      expect(response.headers.get("Retry-After")).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // DB error paths
  // -------------------------------------------------------------------------
  describe("database error handling", () => {
    it("returns 404 when the assignment is not found", async () => {
      mocks.createServiceRoleClient.mockReturnValue(
        makeMockServiceClient({
          assignment: null,
          assignmentError: { message: "No rows returned" },
        })
      )

      const formData = new FormData()
      formData.append("file", makeAudioFile())
      formData.append("assignmentId", "nonexistent-id")

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ error: expect.stringContaining("Assignment not found") })
    })

    it("returns 500 when saving the recitation row fails", async () => {
      mocks.createServiceRoleClient.mockReturnValue(
        makeMockServiceClient({
          recitation: null,
          recitationError: { message: "unique constraint violation" },
        })
      )

      const formData = new FormData()
      formData.append("file", makeAudioFile())
      formData.append("assignmentId", "assignment-xyz")

      const response = await POST(makeAuthorizedRequest(formData))

      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ error: "Failed to save recitation" })
    })
  })
})

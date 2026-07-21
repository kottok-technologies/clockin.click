const urls = (process.env.SMOKE_TEST_URLS || "https://demo.clockin.click,https://wildflower.clockin.click")
  .split(/[\s,]+/)
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

const attempts = Number.parseInt(process.env.SMOKE_TEST_ATTEMPTS || "1", 10);
const delayMs = Number.parseInt(process.env.SMOKE_TEST_DELAY_MS || "20000", 10);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "ClockinClick-SmokeTest/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  if (!response.url.startsWith("https://")) {
    throw new Error(`${url} did not finish on HTTPS (${response.url})`);
  }
  if (new URL(response.url).pathname.startsWith("/api/auth/signin")) {
    throw new Error(`${url} redirected the public kiosk to authentication`);
  }

  return response.text();
}

async function checkValidationEndpoint(baseUrl) {
  const url = `${baseUrl}/api/users/by-pin`;
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ClockinClick-SmokeTest/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status !== 400) {
    throw new Error(`${url} returned HTTP ${response.status}; expected 400`);
  }
  if (!response.url.startsWith("https://")) {
    throw new Error(`${url} was not served over HTTPS`);
  }

  const body = await response.json();
  if (body.error !== "Pin is required") {
    throw new Error(`${url} did not return the expected validation response`);
  }
}

async function checkSite(baseUrl) {
  const body = await fetchPage(baseUrl);
  if (!/Enter your PIN/i.test(body) || !/Clockin\.Click/i.test(body)) {
    throw new Error(`${baseUrl} did not contain the expected kiosk content`);
  }

  await checkValidationEndpoint(baseUrl);
}

if (urls.length === 0) throw new Error("SMOKE_TEST_URLS did not contain any URLs");
if (!Number.isInteger(attempts) || attempts < 1) {
  throw new Error("SMOKE_TEST_ATTEMPTS must be a positive integer");
}
if (!Number.isInteger(delayMs) || delayMs < 0) {
  throw new Error("SMOKE_TEST_DELAY_MS must be a non-negative integer");
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    for (const url of urls) {
      await checkSite(url);
      console.log(`PASS ${url} kiosk smoke checks passed`);
    }
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(
      `Smoke attempt ${attempt}/${attempts} failed:`,
      error instanceof Error ? error.message : error,
    );
    if (attempt < attempts) await wait(delayMs);
  }
}

throw lastError;

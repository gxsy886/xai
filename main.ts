import { serve } from "https://deno.land/std/http/server.ts";

const apiMapping = {
  "/discord": "https://discord.com/api",
  "/telegram": "https://api.telegram.org",
  "/openai": "https://api.openai.com",
  "/claude": "https://api.anthropic.com",
  "/gemini": "https://generativelanguage.googleapis.com",
  "/meta": "https://www.meta.ai/api",
  "/groq": "https://api.groq.com/openai",
  "/xai": "https://api.x.ai",
  "/cohere": "https://api.cohere.ai",
  "/huggingface": "https://api-inference.huggingface.co",
  "/together": "https://api.together.xyz",
  "/novita": "https://api.novita.ai",
  "/portkey": "https://api.portkey.ai",
  "/fireworks": "https://api.fireworks.ai",
  "/openrouter": "https://openrouter.ai/api",
};

serve(async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    return new Response("Service is running!", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (pathname.startsWith("/proxy/")) {
    try {
      const fullUrl = url.href;
      const targetUrl = fullUrl.slice(fullUrl.indexOf("/proxy/") + 7);
      const baseUrl = targetUrl.split("/").slice(0, 3).join("/");
      
      if (!targetUrl) {
        return new Response("Invalid proxy URL", { status: 400 });
      }

      const headers = new Headers();
      const allowedHeaders = [
        "accept",
        "content-type",
        "authorization",
        "upgrade-insecure-requests",
        "user-agent",
        "sec-fetch-site",
        "sec-fetch-mode",
        "sec-fetch-dest",
        "accept-encoding",
        "accept-language",
        "cache-control",
        "pragma",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform"
      ];
      
      for (const [key, value] of request.headers.entries()) {
        if (allowedHeaders.includes(key.toLowerCase())) {
          headers.set(key, value);
        }
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.body,
      });

      const responseHeaders = new Headers(response.headers);
      const origin = request.headers.get("Origin");
      if (origin) {
        responseHeaders.set("Access-Control-Allow-Origin", origin);
      }
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
      responseHeaders.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      responseHeaders.set("Access-Control-Allow-Credentials", "true");
      responseHeaders.set("Access-Control-Max-Age", "86400");
      
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.set("X-Frame-Options", "DENY");
      responseHeaders.set("Referrer-Policy", "no-referrer");

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: responseHeaders,
        });
      }

      const contentType = responseHeaders.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        let text = await response.text();
        text = text.replace(/(href|src)="\/([^"]*)"/g, `$1="/proxy/${baseUrl}/$2"`);
        text = text.replace(/(href|src)="(?!\/?proxy\/|https?:\/\/)([^"]*)"/g, `$1="/proxy/${baseUrl}/$2"`);
        
        return new Response(text, {
          status: response.status,
          headers: responseHeaders,
        });
      }

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("Proxy request failed:", error);
      return new Response("Proxy Request Failed", { status: 500 });
    }
  }

  const [prefix, rest] = extractPrefixAndRest(
    pathname,
    Object.keys(apiMapping)
  );
  if (!prefix) {
    return new Response("Not Found", { status: 404 });
  }

  const targetUrl = `${apiMapping[prefix]}${rest}`;

  try {
    const headers = new Headers();
    const allowedHeaders = [
      "accept",
      "content-type",
      "authorization",
      "upgrade-insecure-requests",
      "user-agent",
      "sec-fetch-site",
      "sec-fetch-mode",
      "sec-fetch-dest",
      "accept-encoding",
      "accept-language",
      "cache-control",
      "pragma",
      "sec-ch-ua",
      "sec-ch-ua-mobile",
      "sec-ch-ua-platform"
    ];
    
    for (const [key, value] of request.headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY");
    responseHeaders.set("Referrer-Policy", "no-referrer");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    responseHeaders.set("Access-Control-Allow-Credentials", "true");
    responseHeaders.set("Access-Control-Max-Age", "86400");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to fetch:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

function extractPrefixAndRest(pathname, prefixes) {
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  return [null, null];
}

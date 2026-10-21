FROM node:22-alpine AS dependencies

WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
# The VPS link to the npm registry is slow: allow a long download (default timeout is 30 s,
# big packages like next / lucide-react time out) and fewer parallel downloads.
RUN yarn install --frozen-lockfile --network-timeout 600000 --network-concurrency 4

FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json yarn.lock ./
COPY . .

# NEXT_PUBLIC_* are baked in at build time (CapRover passes app env vars as build args).
# MDT calls the backend directly from the tablet, so the API address must be set before build.
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3302

RUN corepack enable
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3302

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:3302/ || exit 1

CMD ["yarn", "next", "start", "-p", "3302"]

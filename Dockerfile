# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod files from backend subdirectory
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /briboxd ./cmd/briboxd

# Runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /briboxd .
COPY backend/.env.example .env

EXPOSE 8080

CMD ["./briboxd"]

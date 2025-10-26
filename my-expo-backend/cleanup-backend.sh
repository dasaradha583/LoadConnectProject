#!/bin/bash

echo "🧹 LoadConnect Backend Cleanup Script"
echo "======================================"
echo ""

# Get current directory
BACKEND_DIR="/Users/dasaradha/Coding/karim/my-expo-backend"
cd "$BACKEND_DIR"

echo "📁 Current directory: $PWD"
echo ""

# List files to be deleted
echo "🗑️  Files that will be DELETED:"
echo "├── Server duplicates:"
echo "│   ├── fullServer.js"
echo "│   ├── postgresqlRedisServer-hybrid.js"
echo "│   ├── postgresqlRedisServer-working.js"
echo "│   ├── postgresqlRedisServer.js"
echo "│   ├── postgresqlRedisServer.ts"
echo "│   ├── postgresqlServer.js"
echo "│   └── server.js"
echo "├── Test files:"
echo "│   ├── check-loads-database.js"
echo "│   ├── debug-load-matching.js"
echo "│   ├── test-complete-flow.js"
echo "│   ├── test-geocoding-debug.js"
echo "│   ├── test-load-endpoints.js"
echo "│   ├── test-user-registration.js"
echo "│   ├── testMinimal.js"
echo "│   └── testServer.js"
echo "└── Unused directories:"
echo "    └── src/"
echo ""

echo "✅ Files that will be KEPT:"
echo "├── server-postgresql-redis.js (MAIN SERVER)"
echo "├── package.json"
echo "├── README.md"
echo "├── .env, .env.example"
echo "├── database-cleanup.js"
echo "├── clear-all-loads.js"
echo "├── createSampleLoads.js"
echo "├── geocoding-service.js"
echo "├── india-geocoding-service.js"
echo "├── database-migration.sql"
echo "└── setup.sh, test_server.sh"
echo ""

# Ask for confirmation
read -p "⚠️  Are you sure you want to delete these files? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🗑️  Starting cleanup..."

# Remove duplicate server files
echo "🔄 Removing duplicate server files..."
rm -f fullServer.js
rm -f postgresqlRedisServer-hybrid.js
rm -f postgresqlRedisServer-working.js
rm -f postgresqlRedisServer.js
rm -f postgresqlRedisServer.ts
rm -f postgresqlServer.js
rm -f server.js

# Remove test files
echo "🔄 Removing test files..."
rm -f check-loads-database.js
rm -f debug-load-matching.js
rm -f test-complete-flow.js
rm -f test-geocoding-debug.js
rm -f test-load-endpoints.js
rm -f test-user-registration.js
rm -f testMinimal.js
rm -f testServer.js

# Remove unused src directory
echo "🔄 Removing unused src directory..."
rm -rf src/

echo ""
echo "✅ Cleanup completed!"
echo ""

# Show remaining files
echo "📁 Remaining files:"
ls -la | grep -v node_modules | grep -v .git

echo ""
echo "🎉 Backend directory is now clean!"
echo "📝 Main server: server-postgresql-redis.js"

# Frontend Build Fix - Missing lib Directory

## Problem
The frontend build failed on EC2 with TypeScript errors because the `frontend/src/lib/` directory was missing. This happened because the `.gitignore` file was excluding **all** `lib/` directories, including the frontend's utility library.

## What Was Fixed
- Updated `.gitignore` to only exclude Python lib directories (`/lib/` and `/lib64/` at root level)
- Added all frontend utility files from `frontend/src/lib/`:
  - `api-client.ts` - Axios API client configuration
  - `query-client.ts` - React Query client setup
  - `timezone-utils.ts` - Timezone conversion utilities
  - `timezone-utils.test.ts` - Unit tests for timezone utilities
  - `utils.ts` - General utility functions (cn, etc.)

## How to Fix on EC2 Server

### Option 1: Pull Latest Changes (Recommended)
```bash
cd ~/cronhook-clone
git pull origin main
cd frontend
npm install  # In case any dependencies changed
npm run build
```

### Option 2: Manual File Creation (If git pull doesn't work)
If you can't pull from git for some reason, you can manually create the missing files:

```bash
cd ~/cronhook-clone/frontend/src
mkdir -p lib
cd lib

# Create each file (you'll need the content from the local repository)
# Copy the files from your local machine to the server
```

## Verification
After pulling the latest changes, verify the build works:

```bash
cd ~/cronhook-clone/frontend
npm run build
```

You should see:
```
✓ built in XXXXms
```

The output will be in `frontend/dist/` directory.

## Why This Happened
The original `.gitignore` had:
```gitignore
lib/      # This excluded ALL lib directories
lib64/
```

Now it's fixed to:
```gitignore
/lib/     # Only excludes lib at root level (Python libs)
/lib64/   # Only excludes lib64 at root level (Python libs)
```

The `/` prefix makes it match only at the repository root, not in subdirectories like `frontend/src/lib/`.

## Next Steps on EC2
After `git pull` and successful build:

1. The frontend build output will be in `frontend/dist/`
2. Configure nginx to serve from that directory
3. Setup SSL certificates using `./setup_ssl.sh`
4. Access your application via HTTPS

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete deployment instructions.

# Troubleshooting Guide - Environment Variables

## Problem: Django connecting to wrong database after changing .env

### Symptoms
- Changed `DATABASE_URL` in `.env` file
- Django still tries to connect to old database URL
- Error messages showing old database hostname

### Root Cause
Environment variables are cached in your shell session. Even after changing `.env`, the old values remain in memory until the shell session ends or variables are explicitly unset.

### Solutions

#### Solution 1: Clear cached environment variables (Recommended)
```bash
# Run the clear script
source clear_env.sh

# Then run your command
python manage.py migrate
```

#### Solution 2: Run setup script (clears variables automatically)
```bash
./setup.sh
```

#### Solution 3: Use make commands (clears variables automatically)
```bash
make migrate
make run
```

#### Solution 4: Manual clear and run
```bash
# Clear the specific variable
unset DATABASE_URL

# Run your command
python manage.py migrate
```

#### Solution 5: Start fresh terminal
```bash
# Close current terminal
exit

# Open new terminal
cd /home/ouafi/Projects/Cronehooks-clone
source venv/bin/activate
python manage.py migrate
```

### Prevention

To avoid this issue in the future:

1. **Always use the provided scripts:**
   - `./setup.sh` - Automatically clears variables
   - `make migrate` - Clears variables before running
   - `make run` - Clears variables before running

2. **When manually running commands:**
   ```bash
   # Always prefix with unset
   unset DATABASE_URL && python manage.py migrate
   ```

3. **Use the clear script before manual commands:**
   ```bash
   source clear_env.sh
   python manage.py [command]
   ```

### How Django Loads Environment Variables

```
1. Shell exports environment variables → RAM cache
2. Django starts → Checks RAM cache first
3. If not in cache → Reads .env file
4. Uses first value found (cache takes priority)
```

This is why clearing the cache is necessary!

### Verification

To check what Django is seeing:

```bash
# Activate venv
source venv/bin/activate

# Check current DATABASE_URL
echo $DATABASE_URL

# If it shows the wrong value, clear it
unset DATABASE_URL

# Verify it's gone
echo $DATABASE_URL
# (should be empty)

# Now run Django command
python manage.py migrate
```

### Quick Reference

| Scenario | Command |
|----------|---------|
| Changed .env, need to run command | `source clear_env.sh && python manage.py [cmd]` |
| Running migrations | `make migrate` or `unset DATABASE_URL && python manage.py migrate` |
| Starting server | `make run` or `unset DATABASE_URL && python manage.py runserver` |
| Complete setup | `./setup.sh` |
| Fresh start | Open new terminal, `source venv/bin/activate` |

### Additional Tips

1. **After changing .env:**
   - Always run `source clear_env.sh` first
   - Or use make commands which clear automatically
   - Or start a new terminal session

2. **When debugging connection issues:**
   ```bash
   # Check what Django sees
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.DATABASES['default'])
   ```

3. **For production deployments:**
   - Set environment variables at system level
   - Don't rely on .env files
   - Use secrets management (AWS Secrets Manager, etc.)

### Updated Scripts

The following scripts have been updated to automatically clear environment variables:

- ✅ `setup.sh` - Clears before migrations
- ✅ `clear_env.sh` - Dedicated clearing script
- ✅ `Makefile` - migrate and run targets clear variables

### Still Having Issues?

If you're still experiencing problems:

1. **Check .env file content:**
   ```bash
   cat .env | grep DATABASE_URL
   ```

2. **Check current environment:**
   ```bash
   env | grep DATABASE_URL
   ```

3. **Verify Docker is running:**
   ```bash
   docker-compose ps
   ```

4. **Test database connection:**
   ```bash
   docker exec -it cronhooks_postgres psql -U cronhooks -c "SELECT 1"
   ```

5. **Check PostgreSQL logs:**
   ```bash
   docker-compose logs postgres
   ```

### Example Workflow

```bash
# 1. Change DATABASE_URL in .env
vim .env

# 2. Clear cached variables
source clear_env.sh

# 3. Run migrations
python manage.py migrate

# 4. Start server
python manage.py runserver
```

Or simply:

```bash
# 1. Change DATABASE_URL in .env
vim .env

# 2. Use make (clears automatically)
make migrate
make run
```

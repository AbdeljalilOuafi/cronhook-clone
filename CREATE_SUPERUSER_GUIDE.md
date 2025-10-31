# Django Superuser Creation Guide

## Method 1: Interactive Command (Recommended for First Time)

The easiest way to create a superuser is using Django's built-in management command:

```bash
# Navigate to your project directory
cd /opt/cronhooks/cronhook-clone

# Activate your virtual environment
source /opt/cronhooks/venv/bin/activate

# Run the createsuperuser command
python manage.py createsuperuser
```

This will prompt you for:
- Username
- Email address (optional)
- Password (you'll need to type it twice)

Example:
```
Username (leave blank to use 'ubuntu'): admin
Email address: admin@onsync.ai
Password: ********
Password (again): ********
Superuser created successfully.
```

---

## Method 2: Non-Interactive Command (For Scripts/Automation)

If you want to create a superuser without prompts (useful for deployment scripts):

```bash
# Using environment variables
DJANGO_SUPERUSER_PASSWORD=your_password \
python manage.py createsuperuser \
  --username admin \
  --email admin@onsync.ai \
  --noinput
```

Or in one line:
```bash
python manage.py createsuperuser --username admin --email admin@onsync.ai --noinput
```

Then set the password separately:
```bash
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); u = User.objects.get(username='admin'); u.set_password('your_password'); u.save()"
```

---

## Method 3: Using Django Shell

For more control, you can use the Django shell:

```bash
python manage.py shell
```

Then in the Python shell:
```python
from django.contrib.auth import get_user_model

User = get_user_model()

# Create superuser
user = User.objects.create_superuser(
    username='admin',
    email='admin@onsync.ai',
    password='your_secure_password'
)

print(f"Superuser '{user.username}' created successfully!")
exit()
```

---

## Method 4: Using Your Existing Script

You already have a script in your project! Use it:

```bash
cd /opt/cronhooks/cronhook-clone
source /opt/cronhooks/venv/bin/activate
python set_admin_password.py
```

This will prompt you to enter a new password for the admin user.

---

## Method 5: Quick One-Liner (Python Script)

Create a quick Python script:

```bash
cat > /tmp/create_superuser.py << 'EOF'
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = input("Enter username: ")
email = input("Enter email: ")
password = input("Enter password: ")

if User.objects.filter(username=username).exists():
    print(f"User '{username}' already exists!")
else:
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Superuser '{username}' created successfully!")
EOF

python /tmp/create_superuser.py
```

---

## Verify Superuser Creation

After creating a superuser, verify it works:

```bash
# Check if user exists
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print(User.objects.filter(is_superuser=True).values_list('username', flat=True))"

# Or list all superusers
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); [print(f'{u.username} - {u.email} - Superuser: {u.is_superuser}') for u in User.objects.filter(is_superuser=True)]"
```

---

## Access Django Admin

Once you've created a superuser, you can access the Django admin interface:

1. **Start your Django server** (if not already running):
   ```bash
   sudo systemctl start cronhooks-web
   ```

2. **Visit the admin URL**:
   ```
   https://slack.onsync.ai/admin/
   ```
   or
   ```
   http://your-server-ip:8000/admin/
   ```

3. **Log in** with your superuser credentials

---

## Reset Superuser Password

If you forget the password:

```bash
python manage.py changepassword admin
```

Or using Django shell:
```bash
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); u = User.objects.get(username='admin'); u.set_password('new_password'); u.save(); print('Password updated!')"
```

---

## Common Issues

### Issue: "Superuser must have is_staff=True"
**Solution:** This happens with custom user models. Make sure your User model has `is_staff=True` for superusers.

### Issue: "User already exists"
**Solution:** Either use a different username or delete/update the existing user:
```bash
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').delete()"
```

### Issue: Can't access /admin/
**Solution:** 
1. Make sure `django.contrib.admin` is in `INSTALLED_APPS` (config/settings.py)
2. Make sure admin URLs are included in `config/urls.py`
3. Run migrations: `python manage.py migrate`

---

## Best Practices

1. **Use strong passwords** for production superusers
2. **Limit superuser accounts** - create only what you need
3. **Use different credentials** for development and production
4. **Store passwords securely** - use a password manager
5. **Create regular users** with specific permissions instead of giving everyone superuser access

---

## Quick Command Reference

```bash
# Create superuser (interactive)
python manage.py createsuperuser

# Change password
python manage.py changepassword <username>

# List all superusers
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print(list(User.objects.filter(is_superuser=True).values_list('username', flat=True)))"

# Delete a user
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='<username>').delete()"

# Make existing user a superuser
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); u = User.objects.get(username='<username>'); u.is_superuser = True; u.is_staff = True; u.save()"
```

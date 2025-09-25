# VisionForge Migration Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered during VisionForge migration processes, including diagnostic steps and resolution procedures.

## Quick Diagnostic Commands

```bash
# Check application status
npm run migration:check

# Validate data integrity
node src/migration/data-validator.js

# List available backups
node src/migration/backup.js list

# Check system resources
df -h && free -h && ps aux | grep postgres
```

## Common Issues and Solutions

### 1. Database Connection Issues

#### Error: `Database connection failed: ECONNREFUSED`

**Symptoms:**
- Migration readiness check fails
- Application cannot start
- Database validation errors

**Diagnostic Steps:**
```bash
# Check PostgreSQL service status
systemctl status postgresql

# Test database connectivity
pg_isready -h localhost -p 5432

# Verify connection parameters
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER
```

**Solutions:**

1. **Start PostgreSQL Service**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Verify Connection Parameters**
   ```bash
   # Check .env file
   cat .env | grep DB_

   # Test connection manually
   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
   ```

3. **Fix Network Issues**
   ```bash
   # Check firewall rules
   sudo ufw status

   # Allow PostgreSQL port
   sudo ufw allow 5432
   ```

#### Error: `Database connection failed: authentication failed`

**Solutions:**

1. **Update Credentials**
   ```bash
   # Edit .env file
   nano .env
   # Update DB_USER and DB_PASSWORD
   ```

2. **Reset PostgreSQL Password**
   ```bash
   sudo -u postgres psql
   \password your_username
   ```

3. **Check pg_hba.conf**
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   # Ensure appropriate authentication method
   ```

### 2. Backup and Restore Issues

#### Error: `pg_dump: command not found`

**Solutions:**

1. **Install PostgreSQL Client Tools**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-client

   # CentOS/RHEL
   sudo yum install postgresql

   # macOS
   brew install postgresql
   ```

2. **Add to PATH**
   ```bash
   export PATH="/usr/lib/postgresql/*/bin:$PATH"
   echo 'export PATH="/usr/lib/postgresql/*/bin:$PATH"' >> ~/.bashrc
   ```

#### Error: `Backup file is empty or corrupted`

**Diagnostic Steps:**
```bash
# Check backup file size
ls -lh ./backups/

# Verify backup content
head -20 ./backups/backup-file.sql

# Check disk space during backup
df -h
```

**Solutions:**

1. **Recreate Backup**
   ```bash
   # Remove corrupted backup
   rm ./backups/corrupted-backup.sql

   # Create new backup
   npm run migration:backup
   ```

2. **Check Disk Space**
   ```bash
   # Free up space
   sudo apt-get autoremove
   sudo apt-get autoclean

   # Use external storage
   mkdir /external/backups
   ln -s /external/backups ./backups
   ```

3. **Verify Backup Integrity**
   ```bash
   # Check backup with validation
   node src/migration/backup.js verify backup-file.sql
   ```

### 3. Permission Issues

#### Error: `Permission denied: cannot create backup directory`

**Solutions:**

1. **Fix Directory Permissions**
   ```bash
   # Create backup directory with proper permissions
   sudo mkdir -p ./backups
   sudo chown $(whoami):$(whoami) ./backups
   chmod 755 ./backups
   ```

2. **Run with Proper User**
   ```bash
   # Check current user
   whoami

   # Change ownership recursively
   sudo chown -R $(whoami):$(whoami) .
   ```

#### Error: `Permission denied: cannot write to database`

**Solutions:**

1. **Check Database User Permissions**
   ```bash
   sudo -u postgres psql
   \du your_username
   ```

2. **Grant Necessary Permissions**
   ```sql
   -- Connect as postgres superuser
   sudo -u postgres psql

   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE your_database TO your_username;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
   ```

### 4. Disk Space Issues

#### Error: `No space left on device`

**Diagnostic Steps:**
```bash
# Check disk usage
df -h

# Find large files
du -h --max-depth=1 | sort -hr

# Check inode usage
df -i
```

**Solutions:**

1. **Free Up Space**
   ```bash
   # Remove old backups
   find ./backups -name "*.sql" -mtime +30 -delete

   # Clean npm cache
   npm cache clean --force

   # Clean system logs
   sudo journalctl --vacuum-time=7d
   ```

2. **Compress Backups**
   ```bash
   # Compress existing backups
   gzip ./backups/*.sql

   # Update backup script to compress
   pg_dump $DB_URL | gzip > backup-$(date +%Y%m%d).sql.gz
   ```

3. **Use External Storage**
   ```bash
   # Mount external storage
   sudo mkdir /mnt/external
   sudo mount /dev/sdb1 /mnt/external

   # Update backup directory
   ln -s /mnt/external/backups ./backups
   ```

### 5. Migration Timeout Issues

#### Error: `Migration timed out after 60 minutes`

**Diagnostic Steps:**
```bash
# Check long-running queries
sudo -u postgres psql -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Monitor system resources
top -p $(pgrep postgres)
iostat -x 1
```

**Solutions:**

1. **Increase Timeout**
   ```bash
   # Edit .env file
   MIGRATION_TIMEOUT_MINUTES=120
   ```

2. **Optimize Database**
   ```sql
   -- Analyze tables before migration
   ANALYZE;

   -- Update statistics
   VACUUM ANALYZE;
   ```

3. **Break Down Migration**
   ```bash
   # Split large migration into smaller chunks
   # Process data in batches
   ```

### 6. Data Validation Failures

#### Error: `Data integrity check failed: orphaned records found`

**Diagnostic Steps:**
```bash
# Run detailed data validation
node src/migration/data-validator.js > validation-report.txt

# Check specific integrity issues
grep -i "orphaned\|integrity\|constraint" validation-report.txt
```

**Solutions:**

1. **Clean Up Orphaned Records**
   ```sql
   -- Find orphaned records
   SELECT * FROM child_table c
   LEFT JOIN parent_table p ON c.parent_id = p.id
   WHERE p.id IS NULL;

   -- Delete orphaned records (backup first!)
   DELETE FROM child_table
   WHERE parent_id NOT IN (SELECT id FROM parent_table);
   ```

2. **Fix Referential Integrity**
   ```sql
   -- Add missing parent records
   INSERT INTO parent_table (id, name)
   VALUES (missing_id, 'Generated Parent');

   -- Or update child records to valid parent
   UPDATE child_table
   SET parent_id = valid_parent_id
   WHERE parent_id = invalid_parent_id;
   ```

### 7. Performance Issues

#### Error: `Migration performance degraded significantly`

**Diagnostic Steps:**
```bash
# Check system resources
htop
iotop
free -h

# Monitor database performance
sudo -u postgres psql -c "
SELECT schemaname, tablename, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC;
"
```

**Solutions:**

1. **Add Missing Indexes**
   ```sql
   -- Identify missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public'
   ORDER BY n_distinct DESC;

   -- Create indexes for frequently queried columns
   CREATE INDEX CONCURRENTLY idx_table_column ON table_name(column_name);
   ```

2. **Optimize Queries**
   ```sql
   -- Use EXPLAIN ANALYZE for slow queries
   EXPLAIN ANALYZE SELECT * FROM large_table WHERE condition;

   -- Optimize WHERE clauses
   -- Add appropriate indexes
   ```

3. **Tune PostgreSQL Configuration**
   ```bash
   # Edit postgresql.conf
   sudo nano /etc/postgresql/*/main/postgresql.conf

   # Increase memory settings
   shared_buffers = 256MB
   effective_cache_size = 1GB
   work_mem = 4MB
   ```

### 8. Application Startup Issues

#### Error: `Application fails to start after migration`

**Diagnostic Steps:**
```bash
# Check application logs
tail -f logs/application.log

# Check Node.js version
node --version
npm --version

# Verify dependencies
npm list --depth=0
```

**Solutions:**

1. **Reinstall Dependencies**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Update Configuration**
   ```bash
   # Compare with working configuration
   cp .env.example .env
   # Update with correct values
   ```

3. **Check Port Conflicts**
   ```bash
   # Check if port is already in use
   netstat -tlnp | grep :5000

   # Kill conflicting process
   sudo kill -9 $(lsof -t -i:5000)
   ```

## Advanced Troubleshooting

### Database Corruption Recovery

1. **Detect Corruption**
   ```sql
   -- Check for corruption
   SELECT datname, pg_database_size(datname) as size
   FROM pg_database;

   -- Verify table integrity
   VACUUM FULL VERBOSE table_name;
   ```

2. **Repair Corruption**
   ```bash
   # Stop PostgreSQL
   sudo systemctl stop postgresql

   # Run pg_resetwal (last resort)
   sudo -u postgres pg_resetwal /var/lib/postgresql/*/main

   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

### Network Connectivity Issues

1. **Diagnose Network Problems**
   ```bash
   # Test DNS resolution
   nslookup database-server

   # Test connectivity
   telnet database-server 5432

   # Check routing
   traceroute database-server
   ```

2. **Fix Network Configuration**
   ```bash
   # Update /etc/hosts if needed
   echo "192.168.1.100 database-server" >> /etc/hosts

   # Configure firewall
   sudo ufw allow from 192.168.1.0/24 to any port 5432
   ```

### Memory and Resource Issues

1. **Monitor Resource Usage**
   ```bash
   # Monitor memory usage
   watch -n 1 'free -h && ps aux --sort=-%mem | head -10'

   # Monitor disk I/O
   iostat -x 1 5

   # Check for memory leaks
   valgrind --tool=memcheck --leak-check=yes node src/index.js
   ```

2. **Optimize Resource Usage**
   ```bash
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile

   # Tune kernel parameters
   echo 'vm.swappiness=10' >> /etc/sysctl.conf
   ```

## Monitoring and Alerting

### Set Up Monitoring

1. **Application Monitoring**
   ```bash
   # Monitor application logs
   tail -f logs/application.log | grep -E "(ERROR|FATAL|CRITICAL)"

   # Set up log rotation
   sudo nano /etc/logrotate.d/visionforge
   ```

2. **Database Monitoring**
   ```sql
   -- Monitor active connections
   SELECT count(*) FROM pg_stat_activity;

   -- Monitor slow queries
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 10;
   ```

### Create Alerts

1. **Disk Space Alert**
   ```bash
   #!/bin/bash
   # disk-alert.sh
   THRESHOLD=80
   USAGE=$(df / | awk 'NR==2 {print $5}' | cut -d'%' -f1)

   if [ $USAGE -gt $THRESHOLD ]; then
       echo "Disk usage is ${USAGE}%" | mail -s "Disk Space Alert" admin@example.com
   fi
   ```

2. **Database Connection Alert**
   ```bash
   #!/bin/bash
   # db-alert.sh
   if ! pg_isready -h localhost -p 5432; then
       echo "Database connection failed" | mail -s "DB Alert" admin@example.com
   fi
   ```

## Getting Help

### Internal Support

1. **Check Documentation**
   - Migration Guide: `docs/migration-guide.md`
   - Rollback Procedures: `docs/rollback-procedures.md`
   - API Documentation: `docs/api/`

2. **Team Contacts**
   - Database Team: db-team@company.com
   - DevOps Team: devops@company.com
   - Development Team: dev-team@company.com

### External Support

1. **PostgreSQL Community**
   - Forums: https://www.postgresql.org/support/
   - Documentation: https://www.postgresql.org/docs/

2. **Node.js Support**
   - Official Docs: https://nodejs.org/docs/
   - NPM Issues: https://docs.npmjs.com/

### Emergency Contacts

- **On-Call Engineer**: [Phone Number]
- **Database Administrator**: [Phone Number]
- **System Administrator**: [Phone Number]

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Next Review**: Monthly
**Maintained By**: DevOps Team
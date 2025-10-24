#!/bin/bash

# Quick start script - runs all services in tmux
# Install tmux first: sudo apt install tmux (Linux) or brew install tmux (Mac)

SESSION="cronhooks"

# Check if session exists
tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
    # Create new session
    tmux new-session -d -s $SESSION -n "server"
    
    # Window 0: Django server
    tmux send-keys -t $SESSION:0 "cd /home/ouafi/Projects/Cronehooks-clone && source venv/bin/activate && unset DATABASE_URL && python manage.py runserver" C-m
    
    # Window 1: Celery worker
    tmux new-window -t $SESSION:1 -n "worker"
    tmux send-keys -t $SESSION:1 "cd /home/ouafi/Projects/Cronehooks-clone && source venv/bin/activate && unset DATABASE_URL && ./start_worker.sh" C-m
    
    # Window 2: Celery beat
    tmux new-window -t $SESSION:2 -n "beat"
    tmux send-keys -t $SESSION:2 "cd /home/ouafi/Projects/Cronehooks-clone && source venv/bin/activate && unset DATABASE_URL && ./start_beat.sh" C-m
    
    # Window 3: Shell
    tmux new-window -t $SESSION:3 -n "shell"
    tmux send-keys -t $SESSION:3 "cd /home/ouafi/Projects/Cronehooks-clone && source venv/bin/activate" C-m
    
    # Select first window
    tmux select-window -t $SESSION:0
fi

# Attach to session
tmux attach-session -t $SESSION

#!/bin/bash

# Set environment name and script
ENV_NAME="bangle_post_processing"
PYTHON_SCRIPT="01-preprocess.py"

# Activate conda
eval "$(conda shell.bash hook)" # Proper conda activation in non-interactive shells

# Check if the environment exists, if not, create it
if ! conda env list | grep -q "$ENV_NAME"; then
  echo "Creating conda environment: $ENV_NAME"
  conda env create -n "$ENV_NAME" -f environment.yml
fi

# Activate and run script
echo "Activating environment: $ENV_NAME"
conda activate "$ENV_NAME"

echo "Running $PYTHON_SCRIPT"
python "$PYTHON_SCRIPT"

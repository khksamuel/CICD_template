#!/bin/bash

# Update system
sudo apt-get update

# Install PostgreSQL
sudo apt-get install -y postgresql

# Install Node.js and npm
sudo apt-get install -y nodejs npm

# Install Grafana
wget https://dl.grafana.com/oss/release/grafana_8.2.3_amd64.deb
sudo dpkg -i grafana_8.2.3_amd64.deb

# Clone the repository
git clone https://github.com/khksamuel/CICD_template.git

# Navigate to the repository
cd CICD_template

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install
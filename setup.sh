sudo apt-get update
sudo apt-get install -y postgresql 
sudo apt-get install -y nodejs npm
wget https://dl.grafana.com/enterprise/release/grafana-enterprise-10.1.5.windows-amd64.msi
sudo dpkg -i grafana-enterprise-10.1.5.windows-amd64.msi
git clone https://github.com/khksamuel/CICD_template/tree/circleci-project-setup
cd CICD_template
pip install -r requirements.txt
npm install
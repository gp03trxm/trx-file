#!/usr/bin/env bash
#set -xeuo pipefail
set -euo pipefail

echo "[deploy.sh] bash-version:" $BASH_VERSION

: ${REPOSITORY_NAME="repo_for_deploy"}
: ${HOSTS="trx-dev"}

# convert string to array by space
HOSTS=($HOSTS)

BRANCH="running"
WORK_DIR="~/$REPOSITORY_NAME"
GIT_DIR="~/$REPOSITORY_NAME.git"

echo "[deploy.sh] repo name:" $REPOSITORY_NAME
echo "[deploy.sh] hosts:" $HOSTS

# setup ssh
rm -rf ~/.ssh
cp -r ci/ssh ~/.ssh

echo "[deploy.sh] Getting variable SSH_PRIVATE_KEY from gitlab"
# Replace space to break-line
echo "-----BEGIN RSA PRIVATE KEY-----" > ~/.ssh/id_rsa_deploy
echo $SSH_PRIVATE_KEY | sed -r 's/-----[A-Z ]{7,9} PRIVATE KEY-----//g' | xargs -n1 >> ~/.ssh/id_rsa_deploy
echo "-----END RSA PRIVATE KEY-----" >> ~/.ssh/id_rsa_deploy

chmod 400 ~/.ssh/id_rsa_deploy
chmod 400 ~/.ssh/config

echo "[deploy.sh] Git version"
git --version

echo "[deploy.sh] Git config"
git config -l

echo "[deploy.sh] Listing remotes"
git remote -v

echo "[deploy.sh] Listing local branches"
git branch -v

# setup remote and push
for host in "${HOSTS[@]}";
do
  echo "[deploy.sh] Deploying to $host"
  repo=$host:$GIT_DIR
  remote=remote-$host

  ssh $host "mkdir -p $WORK_DIR"
  (ssh $host "[ ! -d $GIT_DIR ] && git init --bare $GIT_DIR") || true
  scp ./ci/post-receive $repo/hooks

  echo "[deploy.sh] Checking remote exists"
  if ! git remote -v | grep $remote >> /dev/null; then
    echo "[deploy.sh] No $remote at the remote. Add a remote"
    git remote add $remote $repo
  else
    echo "[deploy.sh] Remote $remote exists"
    git remote set-url $remote $repo
  fi

  echo "[deploy.sh] Unshallow if need"
  (git fetch --unshallow $remote) || true

  echo "[deploy.sh] Push to $remote HEAD:$BRANCH"
  git push -f $remote HEAD:refs/heads/$BRANCH

  echo "[deploy.sh] Done"
done

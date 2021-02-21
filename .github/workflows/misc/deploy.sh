#!/usr/bin/env bash
echo "[deploy.sh]" $BASH_VERSION
#set -x

: ${REPOSITORY_NAME="repo_for_deploy"}
: ${HOSTS="trx-dev"}

# convert string to array by space
HOSTS=($HOSTS)

BRANCH="running"
WORK_DIR="~/$REPOSITORY_NAME"
GIT_DIR="~/$REPOSITORY_NAME.git"

# setup ssh
rm -rf ~/.ssh
cp -r .github/workflows/misc/ssh ~/.ssh
chmod 400 ~/.ssh/id_rsa_deploy
chmod 400 ~/.ssh/config

# setup git
git fetch --unshallow origin
git checkout -b $BRANCH

# setup remote and push
for host in "${HOSTS[@]}";
  do
    echo "deploy to $host"
    ssh $host "mkdir -p $WORK_DIR"
    ssh $host "[ ! -d $GIT_DIR ] && git init --bare $GIT_DIR"
    scp .github/workflows/misc/post-receive $host:$GIT_DIR/hooks
    git remote add remote-$host $host:$GIT_DIR
    git push -f remote-$host $BRANCH:$BRANCH
    echo "deploy done"
  done

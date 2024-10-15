ansible cube -b -m apt -a "name=nfs-common state=present"
ansible cube -b -m apt -a "name=open-iscsi state=present"
ansible cube -b -m apt -a "name=util-linux state=present"
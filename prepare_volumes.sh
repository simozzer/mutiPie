#ansible workers_usb -b -m shell -a "umount /dev/{{ var_disk }}"
#ansible workers_usb -b -m shell -a "wipefs -a /dev/{{ var_disk }}"
#ansible workers_usb -b -m filesystem -a "fstype=ext4 dev=/dev/{{ var_disk }}"
#ansible workers_usb -b -m shell -a "rm -rf /storage01/*.*"
ansible workers_usb -b -m shell -a "blkid -s UUID -o value /dev/{{ var_disk }}"
ansible workers_usb -m ansible.posix.mount -a "path=/storage01 src=UUID={{ var_uuid }} fstype=ext4 state=mounted" -b

#ansible workers_nvme -b -m shell -a "umount /dev/{{ var_disk }}"
#ansible workers_nvme -b -m shell -a "wipefs -a /dev/{{ var_disk }}"
#ansible workers_nvme -b -m filesystem -a "fstype=ext4 dev=/dev/{{ var_disk }}"
#ansible workers_usb -b -m shell -a "rm -rf /storage02/*.*"
ansible workers_nvme -b -m shell -a "blkid -s UUID -o value /dev/{{ var_disk }}"
ansible workers_nvme -m ansible.posix.mount -a "path=/storage02 src=UUID={{ var_uuid }} fstype=ext4 state=mounted" -b

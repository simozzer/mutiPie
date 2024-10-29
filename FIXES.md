## If a service is stuck in pending when trying to get externalIP ##
Change the service name, externalIP and namespace accordingly
<pre>kubectl patch svc longhorn-ingress-lb  -p '{"spec": {"type": "LoadBalancer", "externalIPs":["192.168.1.201"]}}' -n longhorn-system</pre>



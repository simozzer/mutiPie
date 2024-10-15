helm repo add metallb https://metallb.github.io/metallb
helm search repo metallb
helm upgrade --install metallb metallb/metallb --create-namespace --namespace metallb-system --wait
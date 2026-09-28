def eq_fonction_affine (xA, xB, yA, yB):
    coef_dir = (yA - yB) / (xA - xB)
    ordo_origine = yA - coef_dir * xA

    fonction = "y = " + str(coef_dir) + " * x + " + str(ordo_origine)
    return fonction

Xa = float(input("Entrez l'abscisse du point A "))
Ya = float(input("Entrez l'ordonnée du point A "))

Xb = float(input("Entrez l'abscisse du point B "))
Yb = float(input("Entrez l'ordonnée du point B "))

print(eq_fonction_affine(Xa, Xb, Ya, Yb))

def var_poly_second_degre(a,b,c):
    if a==0:
        resultat= "La fonction n'est pas une fonction polynôme du second degré"
    else:
        x=-b/(2*a)
        if a>0:
            resultat= "La fonction est décroissante sur  ]-inf ; "+str(x)+"] puis croissante sur ["+str(x)+" ; +inf[."
        else:
            resultat ="La fonction est croissante sur  ]-inf ; "+str(x)+"] puis décroissante sur ["+str(x)+" ; +inf[."
    return resultat

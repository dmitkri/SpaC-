#ifndef UTILS_H
#define UTILS_H

#include <string>

using namespace std;

string hashPassword(const string& password);
string getCurrentDate();
string getCurrentDateTime();

void sendEmailNotification(const string& to, const string& subject, const string& body);

#endif


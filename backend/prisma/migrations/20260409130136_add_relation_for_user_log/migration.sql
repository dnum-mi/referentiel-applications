-- AddForeignKey
ALTER TABLE "UserPermissionLog" ADD CONSTRAINT "UserPermissionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnexionLog" ADD CONSTRAINT "UserConnexionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

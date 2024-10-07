-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "app_compliance_level" AS ENUM ('Dispensée', 'Non passée', 'Partielle', 'Complète', 'Obsolète');

-- CreateEnum
CREATE TYPE "app_data_flow_orient" AS ENUM ('push', 'pull', 'bi-directional');

-- CreateEnum
CREATE TYPE "app_flow_status" AS ENUM ('actif', 'inactif');

-- CreateEnum
CREATE TYPE "env_protection" AS ENUM ('NP', 'DR', 'Secret', 'Très secret');

-- CreateEnum
CREATE TYPE "env_status" AS ENUM ('En construction', 'Actif', 'Inactif');

-- CreateEnum
CREATE TYPE "env_type" AS ENUM ('CaaS', 'IaaS', 'VM', 'BarMetal');

-- CreateEnum
CREATE TYPE "prj_app_type" AS ENUM ('Contributing', 'Managed');

-- CreateTable
CREATE TABLE "abs_tracability" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "abs_tracability_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_actor" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "actorid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "organisationunitid" UUID,
    "validationdate" DATE NOT NULL,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "act_actor_pkey" PRIMARY KEY ("actorid")
);

-- CreateTable
CREATE TABLE "act_actorcode" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "actorid" UUID NOT NULL,
    "actorcodetype" CHAR(5) NOT NULL,
    "actorcode" VARCHAR(100) NOT NULL,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "act_actorcode_pk" PRIMARY KEY ("actorid","actorcode")
);

-- CreateTable
CREATE TABLE "act_actorcodetype" (
    "actorcodetype" CHAR(5) NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "act_actorcodetype_pkey" PRIMARY KEY ("actorcodetype")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" SERIAL NOT NULL,
    "resource" VARCHAR NOT NULL,

    CONSTRAINT "newtable_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "roleid" CHAR(5) NOT NULL,
    "resourceid" INTEGER NOT NULL,
    "create_all" BOOLEAN NOT NULL DEFAULT false,
    "create_own" BOOLEAN NOT NULL DEFAULT false,
    "read_all" BOOLEAN NOT NULL DEFAULT false,
    "read_own" BOOLEAN NOT NULL DEFAULT false,
    "update_all" BOOLEAN NOT NULL DEFAULT false,
    "update_own" BOOLEAN NOT NULL DEFAULT false,
    "delete_all" BOOLEAN NOT NULL DEFAULT false,
    "delete_own" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pk" PRIMARY KEY ("roleid","resourceid")
);

-- CreateTable
CREATE TABLE "app_application" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "applicationid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parentid" UUID,
    "longname" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" CHAR(3) NOT NULL,
    "organisationunitid" UUID NOT NULL,
    "sensitivity" CHAR(2) NOT NULL,
    "apptype" CHAR(5) NOT NULL,

    CONSTRAINT "app_application_pkey" PRIMARY KEY ("applicationid")
);

-- CreateTable
CREATE TABLE "app_applicationid" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "applicationid" UUID NOT NULL,
    "applicationidtypecode" CHAR(5) NOT NULL,
    "shortcode" VARCHAR(20) NOT NULL,
    "longcode" VARCHAR(200),
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "app_applicationid_pk" PRIMARY KEY ("shortcode","applicationidtypecode","applicationid")
);

-- CreateTable
CREATE TABLE "app_compliance" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "applicationid" UUID NOT NULL,
    "compliancetype" CHAR(5) NOT NULL,
    "compliancelevel" "app_compliance_level" NOT NULL DEFAULT 'Non passée',
    "decisiondate" DATE,
    "validitydate" DATE,
    "auditdate" DATE,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "app_compliance_pk" PRIMARY KEY ("applicationid","compliancetype")
);

-- CreateTable
CREATE TABLE "app_compliancetype" (
    "compliancetype" CHAR(5) NOT NULL,
    "description" TEXT,
    "referenceurl" TEXT,

    CONSTRAINT "app_compliancetype_pkey" PRIMARY KEY ("compliancetype")
);

-- CreateTable
CREATE TABLE "app_flow" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "flowid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "applicationsourceid" UUID,
    "organisationunitsourceid" UUID,
    "applicationtargetid" UUID,
    "organisationunittargetid" UUID,
    "middleware" TEXT,
    "flowtypeid" VARCHAR(5),
    "flowprotocolid" VARCHAR(5),
    "flowperiodid" VARCHAR(5),
    "flowdataorientation" "app_data_flow_orient" NOT NULL,
    "ports" VARCHAR(200),
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "app_flow_pkey" PRIMARY KEY ("flowid")
);

-- CreateTable
CREATE TABLE "app_flowdata" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "flowid" UUID NOT NULL,
    "dataid" VARCHAR(255) NOT NULL,
    "datadescription" TEXT,
    "dataurl" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "app_flowdata_pk" PRIMARY KEY ("flowid","dataid")
);

-- CreateTable
CREATE TABLE "app_flowperiod" (
    "flowperiodid" VARCHAR(5) NOT NULL,
    "label" VARCHAR(200),

    CONSTRAINT "app_flowperiod_pkey" PRIMARY KEY ("flowperiodid")
);

-- CreateTable
CREATE TABLE "app_flowprotocol" (
    "flowprotocolid" VARCHAR(5) NOT NULL,
    "label" VARCHAR(200) NOT NULL,

    CONSTRAINT "app_flowprotocol_pkey" PRIMARY KEY ("flowprotocolid")
);

-- CreateTable
CREATE TABLE "app_flowtype" (
    "flowtypeid" VARCHAR(5) NOT NULL,
    "label" VARCHAR(200) NOT NULL,

    CONSTRAINT "app_flowtype_pkey" PRIMARY KEY ("flowtypeid")
);

-- CreateTable
CREATE TABLE "app_idtype" (
    "applicationidtypecode" CHAR(6) NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "app_idtype_pkey" PRIMARY KEY ("applicationidtypecode")
);

-- CreateTable
CREATE TABLE "app_instance" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "environmentid" UUID NOT NULL,
    "applicationid" UUID NOT NULL,
    "instancerole" CHAR(1) DEFAULT 'E',
    "instancestatus" CHAR(3) NOT NULL DEFAULT 'PRD',
    "tenant" TEXT,
    "fip" TEXT,
    "url" TEXT,
    "deploymentdate" DATE,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "app_instance_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_instancerole" (
    "instancerole" CHAR(1) NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "app_instancerole_pkey" PRIMARY KEY ("instancerole")
);

-- CreateTable
CREATE TABLE "app_instancestatus" (
    "instancestatus" CHAR(3) NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "app_instancestatus_pkey" PRIMARY KEY ("instancestatus")
);

-- CreateTable
CREATE TABLE "app_interface" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "interfaceid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "interfacetypeid" CHAR(5) NOT NULL,
    "applicationdatasource" UUID,
    "applicationdistribution" UUID,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "app_interface_pk" PRIMARY KEY ("interfaceid")
);

-- CreateTable
CREATE TABLE "app_interfacetype" (
    "interfacetypeid" CHAR(5) NOT NULL,
    "description" TEXT,

    CONSTRAINT "app_interfacetype_pkey" PRIMARY KEY ("interfacetypeid")
);

-- CreateTable
CREATE TABLE "app_status" (
    "applicationstatuscode" CHAR(3) NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "app_status_pkey" PRIMARY KEY ("applicationstatuscode")
);

-- CreateTable
CREATE TABLE "app_type" (
    "applicationtypecode" CHAR(5) NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "app_type_pkey" PRIMARY KEY ("applicationtypecode")
);

-- CreateTable
CREATE TABLE "env_environment" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "environmentid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "label" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "environmenttype" "env_type" NOT NULL DEFAULT 'CaaS',
    "environmentprotection" "env_protection" NOT NULL DEFAULT 'NP',
    "environmentstatus" "env_status" NOT NULL DEFAULT 'Actif',
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "env_environment_pkey" PRIMARY KEY ("environmentid")
);

-- CreateTable
CREATE TABLE "fct_capability" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "capabilityid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parentid" UUID,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "fct_capability_pkey" PRIMARY KEY ("capabilityid")
);

-- CreateTable
CREATE TABLE "fct_capabilityrealisation" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "applicationid" UUID NOT NULL,
    "capabilityid" UUID NOT NULL,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "fct_capabilityrealisation_pk" PRIMARY KEY ("applicationid","capabilityid")
);

-- CreateTable
CREATE TABLE "fct_urbanzone" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "urbanzoneid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parentid" UUID,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "fct_urbanzone_pkey" PRIMARY KEY ("urbanzoneid")
);

-- CreateTable
CREATE TABLE "fct_urbanzoneapplication" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "urbanzoneid" UUID NOT NULL,
    "applicationid" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "fct_urbanzoneapplication_pk" PRIMARY KEY ("urbanzoneid","applicationid")
);

-- CreateTable
CREATE TABLE "fct_urbanzoneresponsability" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "urbanzoneid" UUID NOT NULL,
    "organisationunitid" UUID NOT NULL,
    "roleid" CHAR(5) NOT NULL,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "fct_urbanzoneresponsability_pk" PRIMARY KEY ("urbanzoneid","organisationunitid","roleid")
);

-- CreateTable
CREATE TABLE "org_organisationunit" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "organisationunitid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parentid" UUID,
    "organisationcode" CHAR(5) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "org_organisationunit_pkey" PRIMARY KEY ("organisationunitid")
);

-- CreateTable
CREATE TABLE "org_roletype" (
    "roleid" CHAR(5) NOT NULL,
    "label" VARCHAR(200) NOT NULL,

    CONSTRAINT "org_roletype_pkey" PRIMARY KEY ("roleid")
);

-- CreateTable
CREATE TABLE "prj_applicationrole" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "applicationid" UUID NOT NULL,
    "actorid" UUID,
    "organisationunitid" UUID NOT NULL,
    "roleid" CHAR(5) NOT NULL,
    "validationdate" DATE NOT NULL,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "prj_applicationrole_pk" PRIMARY KEY ("applicationid","organisationunitid")
);

-- CreateTable
CREATE TABLE "prj_project" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "projectid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "label" TEXT NOT NULL,
    "description" TEXT,
    "parentid" UUID,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "prj_project_pkey" PRIMARY KEY ("projectid")
);

-- CreateTable
CREATE TABLE "prj_projectapplication" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "projectid" UUID NOT NULL,
    "applicationid" UUID NOT NULL,
    "applicationrole" "prj_app_type" NOT NULL DEFAULT 'Managed',
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "prj_projectapplication_pk" PRIMARY KEY ("projectid","applicationid","applicationrole")
);

-- CreateTable
CREATE TABLE "prj_projectresponsability" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "projectid" UUID NOT NULL,
    "actorid" UUID NOT NULL,
    "organisationunitid" UUID NOT NULL,
    "roleid" CHAR(5) NOT NULL,
    "description" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "prj_projectresponsability_pk" PRIMARY KEY ("roleid","organisationunitid","actorid","projectid")
);

-- CreateTable
CREATE TABLE "ptf_portfolio" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "portfolioid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "label" TEXT NOT NULL,
    "description" TEXT,
    "parentid" UUID,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "ptf_portfolio_pkey" PRIMARY KEY ("portfolioid")
);

-- CreateTable
CREATE TABLE "ptf_portfolioapplication" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "portfolioid" UUID NOT NULL,
    "applicationid" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "ptf_portfolioapplication_pk" PRIMARY KEY ("portfolioid","applicationid")
);

-- CreateTable
CREATE TABLE "ptf_portfolioresponsability" (
    "createdby" VARCHAR(200) NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL,
    "updatedby" VARCHAR(200) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,
    "portfolioid" UUID NOT NULL,
    "actorid" UUID NOT NULL,
    "organisationunitid" UUID NOT NULL,
    "roleid" CHAR(5) NOT NULL,
    "desription" TEXT,
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "ptf_portfolioresponsability_pk" PRIMARY KEY ("portfolioid","actorid","organisationunitid","roleid")
);

-- CreateTable
CREATE TABLE "ref_sensitivity" (
    "sensitivitycode" CHAR(2) NOT NULL,
    "label" VARCHAR(200) NOT NULL,

    CONSTRAINT "ref_sensitivity_pkey" PRIMARY KEY ("sensitivitycode")
);

-- CreateIndex
CREATE UNIQUE INDEX "newtable_un" ON "resources"("resource");

-- AddForeignKey
ALTER TABLE "act_actor" ADD CONSTRAINT "act_actor_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_actorcodetype_fkey" FOREIGN KEY ("actorcodetype") REFERENCES "act_actorcodetype"("actorcodetype") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "act_actor"("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_fk" FOREIGN KEY ("roleid") REFERENCES "org_roletype"("roleid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_fk_1" FOREIGN KEY ("resourceid") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_apptype_fkey" FOREIGN KEY ("apptype") REFERENCES "app_type"("applicationtypecode") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_sensitivity_fkey" FOREIGN KEY ("sensitivity") REFERENCES "ref_sensitivity"("sensitivitycode") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_status_fkey" FOREIGN KEY ("status") REFERENCES "app_status"("applicationstatuscode") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_applicationidtypecode_fkey" FOREIGN KEY ("applicationidtypecode") REFERENCES "app_idtype"("applicationidtypecode") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_compliancetype_fkey" FOREIGN KEY ("compliancetype") REFERENCES "app_compliancetype"("compliancetype") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_applicationsourceid_fkey" FOREIGN KEY ("applicationsourceid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_applicationtargetid_fkey" FOREIGN KEY ("applicationtargetid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowperiodid_fkey" FOREIGN KEY ("flowperiodid") REFERENCES "app_flowperiod"("flowperiodid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowprotocolid_fkey" FOREIGN KEY ("flowprotocolid") REFERENCES "app_flowprotocol"("flowprotocolid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowtypeid_fkey" FOREIGN KEY ("flowtypeid") REFERENCES "app_flowtype"("flowtypeid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_organisationunitsourceid_fkey" FOREIGN KEY ("organisationunitsourceid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_organisationunittargetid_fkey" FOREIGN KEY ("organisationunittargetid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_flowdata" ADD CONSTRAINT "app_flowdata_flowid_fkey" FOREIGN KEY ("flowid") REFERENCES "app_flow"("flowid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_environmentid_fkey" FOREIGN KEY ("environmentid") REFERENCES "env_environment"("environmentid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_instancerole_fkey" FOREIGN KEY ("instancerole") REFERENCES "app_instancerole"("instancerole") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_instancestatus_fkey" FOREIGN KEY ("instancestatus") REFERENCES "app_instancestatus"("instancestatus") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_applicationdatasource_fkey" FOREIGN KEY ("applicationdatasource") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_applicationdistribution_fkey" FOREIGN KEY ("applicationdistribution") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_interfacetypeid_fkey" FOREIGN KEY ("interfacetypeid") REFERENCES "app_interfacetype"("interfacetypeid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_capability" ADD CONSTRAINT "fct_capability_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "fct_capability"("capabilityid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_capabilityid_fkey" FOREIGN KEY ("capabilityid") REFERENCES "fct_capability"("capabilityid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_urbanzone" ADD CONSTRAINT "fct_urbanzone_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "fct_urbanzone"("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_urbanzoneid_fkey" FOREIGN KEY ("urbanzoneid") REFERENCES "fct_urbanzone"("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "org_roletype"("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_urbanzoneid_fkey" FOREIGN KEY ("urbanzoneid") REFERENCES "fct_urbanzone"("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_organisationunit" ADD CONSTRAINT "org_organisationunit_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "act_actor"("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "org_roletype"("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_project" ADD CONSTRAINT "prj_project_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "prj_project"("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_projectid_fkey" FOREIGN KEY ("projectid") REFERENCES "prj_project"("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "act_actor"("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_projectid_fkey" FOREIGN KEY ("projectid") REFERENCES "prj_project"("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "org_roletype"("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolio" ADD CONSTRAINT "ptf_portfolio_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "ptf_portfolio"("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "app_application"("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_portfolioid_fkey" FOREIGN KEY ("portfolioid") REFERENCES "ptf_portfolio"("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "act_actor"("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "org_organisationunit"("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_portfolioid_fkey" FOREIGN KEY ("portfolioid") REFERENCES "ptf_portfolio"("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "org_roletype"("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;

